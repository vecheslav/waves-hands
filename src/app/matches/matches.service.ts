import { Injectable, NgZone } from '@angular/core'
import { HandSign, IMatchResolve, Match, MatchResolveType, MatchResult, MatchStatus, ReimbursedStatus, TMatch } from './shared/match.interface'
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
  matches: Record<string, Match>
  currentHeight: number
}

@Injectable()
export class MatchesService {
  updates$ = new BehaviorSubject<Record<string, Match>>(null)
  height$ = new BehaviorSubject<number>(null)
  openMatch$ = new BehaviorSubject<Match>(null)

  // All received matches
  private _receivedMatches: Record<string, Match> = {}

  // All transient matches
  private _transientMatches: Record<string, Match> = {}

  private _user: IUser
  private _polling: Observable<any>
  private _pollingSubscriber: SubscriptionLike

  constructor(private matchesHelper: MatchesHelper,
    private ngZone: NgZone,
    private userService: UserService,
    private notificationsService: NotificationsService,
    private storage: StorageHelper) {
    this._polling = timer(0, environment.matchesPollingDelay).pipe(
      concatMap(_ => {
        return this.matchesHelper.getMatchList()
      })
    )

    this.userService.user$.subscribe((user: IUser) => {
      this._user = user

      if (this._user) {
        this._transientMatches = Object.values(this.storage.getMatches(this._user.address))
          .map((m: TMatch) => Match.create(m))
          .toRecord((m: Match) => m.address)
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

  async getMatch(address: string): Promise<Match> {
    const match = await this.matchesHelper.getMatch(address)
    this.openMatch$.next(match)

    return match
  }

  async createMatch(hands: HandSign[], progress?: (zeroToOne: number) => void): Promise<Match> {
    const { move, match } = await this.matchesHelper.create(hands, progress)

    this._setMyMatch(match)
    this._setMyMove(match.address, move)

    this.notificationsService.add({
      type: NotificationType.Action,
      params: [ActionType.YouCreated, match.address],
    })

    return match
  }

  async joinMatch(match: Match, hands: number[], progress?: (zeroToOne: number) => void): Promise<Match> {
    await this.matchesHelper.join(match, hands, progress)
    const { move } = hideMoves(hands)

    this._setMyMatch(match)
    this._setMyMove(match.address, move)

    this.notificationsService.add({
      type: NotificationType.Action,
      params: [ActionType.YouJoined, match.address],
    })

    return match
  }

  async reveal(matchAddress: string) {
    const match = this._transientMatches[matchAddress]
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

      this._setMyMatch(this._ignoreTransient(match))

      this.notificationsService.remove(nId)
    } catch (err) {
      this.notificationsService.remove(nId)
      this.notificationsService.add({ type: NotificationType.Error, message: 'ERROR_REVEAL_MATCH' })
      throw err
    }
  }

  async revokeBet(matchAddress: string) {
    const match = this._transientMatches[matchAddress]

    if (!match || !match.reimbursed || !this._user) {
      return
    }

    const nId = this.notificationsService.add({
      type: NotificationType.Process,
      message: 'PROCESS_PAYOUT_MATCH',
    })

    try {
      await this.matchesHelper.cashback(match, '')
      match.reimbursed = ReimbursedStatus.Done

      this._setMyMatch(this._ignoreTransient(match))

      this.notificationsService.remove(nId)
    } catch (err) {
      this.notificationsService.remove(nId)
      this.notificationsService.add({ type: NotificationType.Error, message: 'ERROR_PAYOUT_MATCH' })
      throw err
    }
  }

  async payout(matchAddress: string) {
    const match = this._transientMatches[matchAddress]
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
      this.notificationsService.add({ type: NotificationType.Error, message: 'ERROR_PAYOUT_MATCH' })
      throw err
    }
  }

  applyRevoke(address: string) {
    const match = this._transientMatches[address]
    if (!match || match.reimbursed === ReimbursedStatus.Done || !this._user) {
      return
    }

    match.reimbursed = ReimbursedStatus.Need
    this._setMyMatch(this._ignoreTransient(match))
  }

  private _updateMatches(newMatches: Record<string, Match>): void {
    const updates: Record<string, Match> = {}
    const openMatch = this.openMatch$.getValue()

    // Resolve changes with local matches
    const resolvedMatchAddresses = this._resolveMatches(newMatches)

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
        if (resolvedMatchAddresses && resolvedMatchAddresses.indexOf(match.address) > -1) {
          this._transientMatches[match.address] = actualMatch
          console.log(actualMatch)
          this._setMyMatch(this._ignoreTransient(actualMatch))
        }
      }
    }

    // Assign last received matches
    this._receivedMatches = newMatches

    if (Object.values(updates).length) {
      this.updates$.next(updates)
    }
  }

  private _buildMatch(match: Match): Match {

    const mergedMatch: Match = Match.create({
      ...Match.toPlain(this._receivedMatches[match.address]),
      ...Match.toPlain((this._transientMatches[match.address] || {}) as Match),
      ...Match.toPlain(match),
    })

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

  private _ignoreTransient(match: Match): Match {
    const newMatch = Match.create(match)
    delete newMatch.isRevealing
    delete newMatch.isPayout
    return newMatch
  }

  private _resolveMatches(newMatches: Record<string, Match>): string[] {
    if (!this._user) {
      return
    }

    const localMatches = this.storage.getMatches(this._user.address)
    const resolves = this._compareMatches(localMatches, newMatches)

    for (const resolve of resolves) {
      switch (resolve.type) {
        case MatchResolveType.Accepted:
          this.notificationsService.add({ type: NotificationType.Action, params: [ActionType.OpponentJoined, resolve.matchAddress] })
          this.reveal(resolve.matchAddress)
          break
        case MatchResolveType.NeedReveal:
          this.reveal(resolve.matchAddress)
          break
        case MatchResolveType.NeedReimbursed:
          this.applyRevoke(resolve.matchAddress)
          break
        case MatchResolveType.Won:
          this.notificationsService.add({ type: NotificationType.Action, params: [ActionType.Won, resolve.matchAddress] })
          break
        case MatchResolveType.Lost:
          this.notificationsService.add({ type: NotificationType.Action, params: [ActionType.Lost, resolve.matchAddress] })
          break
        case MatchResolveType.Draw:
          this.notificationsService.add({ type: NotificationType.Action, params: [ActionType.Draw, resolve.matchAddress] })
          break
      }
    }

    return resolves.map(resolve => resolve.matchAddress)
  }

  /**
   * Get two match list and return resolve list
   * @param localMatches
   * @param newMatches
   * @private
   */
  private _compareMatches(localMatches: Record<string, TMatch>, newMatches: Record<string, Match>): IMatchResolve[] {
    const matchResolves = []

    for (const matchAddress of Object.keys(localMatches)) {
      const match = Match.create(localMatches[matchAddress])
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
  private _resolveMatch(match: Match, newMatch: Match): MatchResolveType {
    const isCreator = match.creator && this._user.address === match.creator.address
    const isOpponent = match.opponent && this._user.address === match.opponent.address

    if (!newMatch) {
      return MatchResolveType.Nothing
    }

    if (match.status === MatchStatus.WaitingForP2 &&
      (newMatch.status === MatchStatus.WaitingBothToReveal ||
        newMatch.status === MatchStatus.WaitingP1ToReveal ||
        newMatch.status === MatchStatus.WaitingP2ToReveal ||
        newMatch.status === MatchStatus.WaitingForDeclare ||
        newMatch.status === MatchStatus.WaitingForPayout) &&
      isCreator) {
      return MatchResolveType.Accepted
    }

    if (!match.revealed &&
      (newMatch.status === MatchStatus.WaitingBothToReveal ||
        newMatch.status === MatchStatus.WaitingP1ToReveal ||
        newMatch.status === MatchStatus.WaitingP2ToReveal ||
        newMatch.status === MatchStatus.WaitingForDeclare ||
        newMatch.status === MatchStatus.WaitingForPayout) &&
      typeof newMatch.result === 'undefined' &&
      isCreator) {
      return MatchResolveType.NeedReveal
    }

    if (!match.reimbursed &&
        isOpponent &&
        (newMatch.opponent && this._user.address !== newMatch.opponent.address)) {
      return MatchResolveType.NeedReimbursed
    }

    if (match.status !== MatchStatus.Done && newMatch.status === MatchStatus.Done) {

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

  private _setMyMatch(match: Match): void {
    if (!this._user) {
      return
    }

    // Update my match on local storage
    this.storage.setMatch(this._user.address, Match.toPlain(match))
  }

  private _setMyMove(matchAddress: string, move: Uint8Array): void {
    if (!this._user) {
      return
    }

    this.storage.setMove(this._user.address, matchAddress, move)
  }
}
