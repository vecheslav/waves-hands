import { Injectable, NgZone } from '@angular/core'
import { HandSign, IMatchResolve, MatchResolveType, MatchResult, MatchStatus, RevokedStatus, IMatch } from './shared/match.interface'
import { environment } from '../../environments/environment'
import { MatchesHelper } from './shared/matches.helper'
import { BehaviorSubject, Observable, SubscriptionLike, timer } from 'rxjs'
import { concatMap } from 'rxjs/operators'
import { IUser } from '../user/user.interface'
import { UserService } from '../user/user.service'
import { ActionType, NotificationType } from '../notifications/notifications.interface'
import { NotificationsService } from '../notifications/notifications.service'
import { StorageHelper } from '../shared/storage/storage.helper'
import * as equal from 'fast-deep-equal'
import { hideMoves } from '../hands/game-related/game'

interface IMatchListResponse {
  matches: Record<string, IMatch>
  currentHeight: number
}

@Injectable()
export class MatchesService {
  updates$ = new BehaviorSubject<Record<string, IMatch>>(null)
  height$ = new BehaviorSubject<number>(null)
  openMatch$ = new BehaviorSubject<IMatch>(null)

  // All received matches
  private _receivedMatches: Record<string, IMatch> = {}

  // All transient matches
  private _myTransientMatches: Record<string, IMatch> = {}

  private _user: IUser
  private _polling: Observable<any>
  private _pollingSubscriber: SubscriptionLike

  constructor(private matchesHelper: MatchesHelper,
              private ngZone: NgZone,
              private userService: UserService,
              private notificationsService: NotificationsService,
              private storage: StorageHelper) {
    this._polling = timer(0, environment.matchesPollingDelay).pipe(
      concatMap(_ => this.matchesHelper.getMatchList())
    )

    this.userService.user$.subscribe((user: IUser) => {
      this._user = user

      if (this._user) {
        this._myTransientMatches = this.storage.getMatches(this._user.address)
      }
    })
  }

  startPolling(): void {
    this.ngZone.runOutsideAngular(() => {
      this._pollingSubscriber = this._polling.subscribe((res: IMatchListResponse) => {
        this.ngZone.run(() => {
          // Update current height
          this.height$.next(res.currentHeight)

          // Update matches
          this._updateMatches(res.matches)
        })
      })
    })
  }

  stopPolling(): void {
    if (this._pollingSubscriber) {
      this._pollingSubscriber.unsubscribe()
    }
  }

  async getMatch(address: string): Promise<IMatch> {
    const match = await this.matchesHelper.getMatch(address)
    this.openMatch$.next(match)

    return match
  }

  async createMatch(hands: HandSign[], progress?: (zeroToOne: number) => void): Promise<IMatch> {
    const {move, match} = await this.matchesHelper.create(hands, progress)

    this._setMyMatch(match)
    this._setMyMove(match.address, move)

    this.notificationsService.add({
      type: NotificationType.Action,
      params: [ActionType.YouCreated, match.address],
    })

    return match
  }

  async joinMatch(match: IMatch, hands: number[], progress?: (zeroToOne: number) => void): Promise<IMatch> {
    const { match: joinedMatch, error } = await this.matchesHelper.join(match, hands, progress)

    if (error && error.code === 1) {
      this.notificationsService.add({type: NotificationType.Error, message: 'ERROR_MATCH_RESERVED'})
    }

    if (!joinedMatch.opponent) {
      this.notificationsService.add({type: NotificationType.Error, message: 'ERROR_TRANSFER_STUCK'})
    }

    const {move} = hideMoves(hands)

    this._setMyMatch(joinedMatch)
    this._setMyMove(match.address, move)

    this.notificationsService.add({
      type: NotificationType.Action,
      params: [ActionType.YouJoined, match.address],
    })

    return match
  }

  async reveal(matchAddress: string) {
    const match = this._myTransientMatches[matchAddress]
    if (!match || match.isRevealing || !this._user) {
      return
    }

    const move = this.storage.getMove(this._user.address, matchAddress)
    if (!move) {
      return
    }

    const nId = this.notificationsService.add({
      type: NotificationType.Process,
      message: 'PROCESS_REVEAL_MATCH',
    })

    // Exclude revealing
    match.isRevealing = true
    try {
      await this.matchesHelper.reveal(match, move)
      match.revealed = true
      match.isRevealing = false

      this._setMyMatch(match)

      this.notificationsService.remove(nId)
    } catch (err) {
      this.notificationsService.remove(nId)
      this.notificationsService.add({type: NotificationType.Error, message: 'ERROR_REVEAL_MATCH'})
      throw err
    }
  }

  async revokeBet(matchAddress: string) {
    const match = this._myTransientMatches[matchAddress]

    if (!match || !match.revoked || !this._user || !(match.payments && match.payments.length)) {
      return
    }

    const nId = this.notificationsService.add({
      type: NotificationType.Process,
      message: 'PROCESS_PAYOUT_MATCH',
    })

    try {
      await this.matchesHelper.cashback(match, match.payments[0])
      match.revoked = RevokedStatus.Done

      this._setMyMatch(match)

      this.notificationsService.remove(nId)
    } catch (err) {
      this.notificationsService.remove(nId)
      this.notificationsService.add({type: NotificationType.Error, message: 'ERROR_PAYOUT_MATCH'})
      throw err
    }
  }

  async payout(matchAddress: string) {
    const match = this._myTransientMatches[matchAddress]
    if (!match || match.isPayout || !this._user) {
      return
    }

    const nId = this.notificationsService.add({
      type: NotificationType.Process,
      message: 'PROCESS_PAYOUT_MATCH',
    })

    // Exclude revealing
    match.isPayout = true
    try {
      await this.matchesHelper.payout(match)
      match.isPayout = false

      this.notificationsService.remove(nId)
    } catch (err) {
      this.notificationsService.remove(nId)
      this.notificationsService.add({type: NotificationType.Error, message: 'ERROR_PAYOUT_MATCH'})
      throw err
    }
  }

  applyRevoke(address: string) {
    const match = this._myTransientMatches[address]
    if (!match || match.revoked === RevokedStatus.Done || !this._user) {
      return
    }

    match.revoked = RevokedStatus.Need
    this._setMyMatch(match)
  }

  private _updateMatches(newMatches: Record<string, IMatch>): void {
    const updates: Record<string, IMatch> = {}
    const openMatch = this.openMatch$.getValue()

    // Resolve changes with local matches
    const localMatchAddresses = this._resolveMatches(newMatches)

    // Find changes
    for (const match of Object.values(newMatches)) {
      if (!equal(this._receivedMatches[match.address], match)) {
        // Build match
        const actualMatch = this._buildMatch(match)

        // Update all matches
        updates[match.address] = actualMatch

        // Notice match popup
        if (openMatch && openMatch.address === match.address) {
          this.openMatch$.next(actualMatch)
        }

        // Update my matches
        if (localMatchAddresses && localMatchAddresses.indexOf(match.address) > -1) {
          // console.log('actualMatch', actualMatch)
          this._setMyMatch(actualMatch)
        }
      }
    }

    // Assign last received matches
    this._receivedMatches = newMatches

    if (Object.values(updates).length) {
      this.updates$.next(updates)
    }
  }

  private _buildMatch(match: IMatch): IMatch {

    const mergedMatch: IMatch = {
      ...this._receivedMatches[match.address],
      ...(this._myTransientMatches[match.address] || {}),
      ...match,
    }

    if (this._user) {
      mergedMatch.owns = match.creator.address === this._user.address

      if (match.status === MatchStatus.WaitingForDeclare) {
        if (match.result === MatchResult.Opponent) {
          mergedMatch.canDeclare = this._user.address === match.opponent.address
        } else if (match.result === MatchResult.Creator) {
          mergedMatch.canDeclare = this._user.address === match.creator.address
        } else {
          mergedMatch.canDeclare = this._user.address === match.creator.address || this._user.address === match.opponent.address
        }
      }
    }

    return mergedMatch
  }

  private _ignoreTransient(match: IMatch): IMatch {
    const newMatch = { ...match }
    delete newMatch.isRevealing
    delete newMatch.isPayout
    return newMatch
  }

  private _resolveMatches(newMatches: Record<string, IMatch>): string[] {
    if (!this._user) {
      return
    }

    const localMatches = this.storage.getMatches(this._user.address)
    const resolves = this._compareMatches(localMatches, newMatches)

    for (const resolve of resolves) {
      switch (resolve.type) {
        case MatchResolveType.Accepted:
          this.notificationsService.add({type: NotificationType.Action, params: [ActionType.OpponentJoined, resolve.matchAddress]})
          this.reveal(resolve.matchAddress)
          break
        case MatchResolveType.NeedReveal:
          this.reveal(resolve.matchAddress)
          break
        case MatchResolveType.NeedPayout:
          break
        case MatchResolveType.NeedRevoke:
          this.applyRevoke(resolve.matchAddress)
          break
        case MatchResolveType.Won:
          this.notificationsService.add({type: NotificationType.Action, params: [ActionType.Won, resolve.matchAddress]})
          break
        case MatchResolveType.Lost:
          this.notificationsService.add({type: NotificationType.Action, params: [ActionType.Lost, resolve.matchAddress]})
          break
        case MatchResolveType.Draw:
          this.notificationsService.add({type: NotificationType.Action, params: [ActionType.Draw, resolve.matchAddress]})
          break
      }
    }

    // All addresses of local matches
    return Object.keys(localMatches)
  }

  /**
   * Get two match list and return resolve list
   * @param localMatches
   * @param newMatches
   * @private
   */
  private _compareMatches(localMatches: Record<string, IMatch>, newMatches: Record<string, IMatch>): IMatchResolve[] {
    const matchResolves = []

    for (const matchAddress of Object.keys(localMatches)) {
      const match = localMatches[matchAddress]
      const newMatch = newMatches[matchAddress]

      if (!newMatch) {
        continue
      }

      const resolve = this._resolveMatch(match, newMatch)
      if (resolve === MatchResolveType.Nothing) {
        continue
      }

      matchResolves.push({
        type: resolve,
        matchAddress,
      })
    }

    return matchResolves
  }

  /**
   * Compare two matches and return your resolve
   * @param match
   * @param newMatch
   * @private
   */
  private _resolveMatch(match: IMatch, newMatch: IMatch): MatchResolveType {
    // It's for local matches
    const isCreator = match.creator && this._user.address === match.creator.address
    const isOpponent = match.opponent && this._user.address === match.opponent.address

    if (!newMatch) {
      return MatchResolveType.Nothing
    }

    if (
      isCreator &&
      match.status === MatchStatus.WaitingForP2 &&
      (
        newMatch.status === MatchStatus.WaitingBothToReveal ||
        newMatch.status === MatchStatus.WaitingP1ToReveal ||
        newMatch.status === MatchStatus.WaitingP2ToReveal
      )
    ) {
      return MatchResolveType.Accepted
    }

    if (
      isCreator &&
      !match.revealed &&
      (
        newMatch.status === MatchStatus.WaitingBothToReveal ||
        newMatch.status === MatchStatus.WaitingP1ToReveal ||
        newMatch.status === MatchStatus.WaitingP2ToReveal
      )
    ) {
      return MatchResolveType.NeedReveal
    }

    if (
      isOpponent &&
      !match.revoked &&
      (
        newMatch.opponent &&
        this._user.address !== newMatch.opponent.address
      )
    ) {
      return MatchResolveType.NeedRevoke
    }

    if (
      match.status !== MatchStatus.Done &&
      newMatch.status === MatchStatus.Done
    ) {
      if (newMatch.result === MatchResult.Opponent) {
        if (isOpponent) {
          return MatchResolveType.Won
        } else {
          return MatchResolveType.Lost
        }

      } else if (newMatch.result === MatchResult.Draw) {
        return MatchResolveType.Draw
      }

      if (isCreator) {
        return MatchResolveType.Won
      } else {
        return MatchResolveType.Lost
      }
    }

    return MatchResolveType.Nothing
  }

  private _setMyMatch(match: IMatch): void {
    if (!this._user) {
      return
    }

    this._myTransientMatches[match.address] = match

    // Update my match on local storage
    this.storage.setMatch(this._user.address, this._ignoreTransient(match))
  }

  private _setMyMove(matchAddress: string, move: Uint8Array): void {
    if (!this._user) {
      return
    }

    this.storage.setMove(this._user.address, matchAddress, move)
  }
}
