import { Injectable, NgZone, OnDestroy } from '@angular/core'
import { MatchesHelper } from './shared/matches.helper'
import { HandSign, IMatch, IMatchResolve, IMatchProcess, MatchResolveType, MatchResult, MatchStatus, PlayerMoves } from './shared/match.interface'
import { BehaviorSubject, Observable, Subject, timer } from 'rxjs'
import { UserService } from '../user/user.service'
import { IUser } from '../user/user.interface'
import { concatMap } from 'rxjs/operators'
import { base58decode, base58encode } from 'waves-crypto'
import { NotificationsService } from '../notifications/notifications.service'
import { ActionType, NotificationType } from '../notifications/notifications.interface'
import { environment } from 'src/environments/environment'
import { TourService } from '../shared/tour/tour.service'
import * as equal from 'fast-deep-equal'

type IMatches = Record<string, IMatch & IMatchProcess>

@Injectable()
export class MatchesService implements OnDestroy {
  updates$ = new BehaviorSubject<IMatches>(null)

  currentMatch$ = new BehaviorSubject<IMatch>(null)
  currentHeight$ = new BehaviorSubject<number>(null)

  // Actual state all matches
  matches: IMatches = {}

  user: IUser
  updateIsPaused = false

  private _userSubscriber

  private _polledMatchesTimer: Observable<{ matches: IMatches, currentHeight: number }>
  private _pollingSubscriber

  private _tourSubscriber

  constructor(private matchesHelper: MatchesHelper,
    private userService: UserService,
    private notificationsService: NotificationsService,
    private ngZone: NgZone,
    private tourService: TourService) {
    this._userSubscriber = this.userService.user$.subscribe((user: IUser) => {
      this.user = user

      // Add my local matches
      this.matches = this._localMatches || {}
    })

    // Define polling observable
    this._polledMatchesTimer = timer(0, 5000).pipe(
      concatMap(_ => this.getMatchList())
    )

    this._tourSubscriber = this.tourService.activated$.subscribe(activated => {
      this.updateIsPaused = activated
    })
  }

  ngOnDestroy() {
    this._userSubscriber.unsubscribe()
    this._tourSubscriber.unsubscribe()
  }

  async startPollingMatches() {
    console.log('📮Starting polling matches...')
    const self = this

    this.ngZone.runOutsideAngular(() => {
      this._pollingSubscriber = this._polledMatchesTimer.subscribe(res => {
        this.ngZone.run(() => {
          if (this.updateIsPaused) {
            return
          }

          // Update current height
          this.currentHeight$.next(res.currentHeight)

          const resolvedMatchAddresses = this._resolveMatches.call(self, res.matches)
          this._updateMatches(res.matches, resolvedMatchAddresses)
        })
      })
    })
  }

  async stopPollingMatches() {
    if (this._pollingSubscriber) {
      this._pollingSubscriber.unsubscribe()
    }
  }

  getMatchList(): Promise<{ matches: IMatches, currentHeight: number }> {
    return this.matchesHelper.getMatchList()
  }

  async getMatch(address: string): Promise<IMatch> {
    const match = await this.matchesHelper.getMatch(address)
    this.currentMatch$.next(match)

    return match
  }

  async createMatch(moves: HandSign[], progress?: (zeroToOne: number) => void): Promise<IMatch> {
    const { move, moveHash, match } = await this.matchesHelper.createMatch(moves, progress)

    this._saveMyMatch(match)
    this._saveMyMove(match.address, move)

    this.notificationsService.add({
      type: NotificationType.Action,
      params: [ActionType.YouCreated, match.address]
    })

    return match
  }

  async joinMatch(match: IMatch,
    moves: number[],
    progress?: (zeroToOne: number) => void) {

    await this.matchesHelper.joinMatch(match.publicKey, match.address, moves, progress)

    const { move } = this.matchesHelper.hideMoves(moves)
    this._saveMyMatch(match)
    this._saveMyMove(match.address, move)

    this.notificationsService.add({
      type: NotificationType.Action,
      params: [ActionType.YouJoined, match.address]
    })
  }

  async revealMatch(matchAddress: string) {
    const match = this.matches[matchAddress]
    if (!match) {
      return
    }

    if (match.isRevealing) {
      return
    }

    const move = this._getMoveFromStorage(this.user.address, match.address)
    if (!move) {
      return
    }

    const notificationId = this.notificationsService.add({
      type: NotificationType.Process,
      message: 'PROCESS_FINISH_MATCH'
    })

    // Book reveal match
    match.isRevealing = true

    console.log('Reveal match', match.address)
    try {
      await this.matchesHelper.revealMatch(match, move)
      match.revealed = true
      match.isRevealing = false

      this.notificationsService.remove(notificationId)
    } catch (err) {
      this.notificationsService.remove(notificationId)
      this.notificationsService.add({ type: NotificationType.Error, message: 'ERROR_REVEAL_MATCH' })
      throw err
    }
  }

  async forceFinishMatch(matchAddress: string) {
    const match = this.matches[matchAddress]
    if (!match) {
      return
    }

    // Skip matches with started finishing
    // if (match.isRevealing) {
    //   return
    // }

    const notificationId = this.notificationsService.add({
      type: NotificationType.Process,
      message: 'PROCESS_FINISH_MATCH'
    })

    // match.isRevealing = true

    console.log('Force finish match', matchAddress)
    try {
      await this.matchesHelper.forceFinish(match)
      match.revealed = true

      this.notificationsService.remove(notificationId)
    } catch (err) {
      // match.isRevealing = false
      this.notificationsService.remove(notificationId)
      throw err
    }
  }

  getMyMoves(matchAddress: string): PlayerMoves {
    if (!this.user) {
      return
    }

    const moves = this._getMoveFromStorage(this.user.address, matchAddress).slice(0, 3)
    return Array.from(moves) as PlayerMoves
  }

  private get _localMatches(): IMatches {
    if (!this.user) {
      return
    }

    return this._getMatchesFromStorage(this.user.address)
  }

  private _updateMatches(fetchedMatches: IMatches, resolvedMatchAddresses?: string[]) {
    const updates: IMatches = {}
    const currentMatch = this.currentMatch$.getValue()

    for (const match of Object.values(fetchedMatches)) {
      if (!equal(this.matches[match.address], match)) {
        // Merged match has process and view members
        const mergedMatch = { ...this.matches[match.address], ...match }

        if (this.user) {
          mergedMatch.owns = match.creator.address === this.user.address
        }

        updates[match.address] = mergedMatch
        this.matches[match.address] = mergedMatch

        if (currentMatch && currentMatch.address === match.address) {
          this.currentMatch$.next(mergedMatch)
        }

        if (resolvedMatchAddresses.indexOf(match.address) > -1) {
          this._saveMyMatch(mergedMatch)
        }
      }
    }

    if (Object.values(updates).length) {
      this.updates$.next(updates)
    }
  }

  /**
   * Some actions are taken depending on changes
   * @param fetchedMatches
   * @private
   */
  private _resolveMatches(fetchedMatches: IMatches): string[] {
    if (!this.user) {
      return
    }

    const localMatches = this._localMatches

    if (!localMatches) {
      return
    }

    const resolves = this._compareMatches(localMatches, fetchedMatches)

    try {
      for (const resolve of resolves) {
        switch (resolve.type) {
          case MatchResolveType.Accepted:
            this.notificationsService.add({
              type: NotificationType.Action,
              params: [ActionType.OpponentJoined, resolve.matchAddress]
            })

            this.revealMatch(resolve.matchAddress)
            break
          case MatchResolveType.NeedReveal:
            this.revealMatch(resolve.matchAddress)
            break
          case MatchResolveType.CreatorMissed:
            this.forceFinishMatch(resolve.matchAddress)
            break
          case MatchResolveType.Won:
            this.notificationsService.add({
              type: NotificationType.Action,
              params: [ActionType.Won, resolve.matchAddress]
            })
            break
          case MatchResolveType.Lost:
            this.notificationsService.add({
              type: NotificationType.Action,
              params: [ActionType.Lost, resolve.matchAddress]
            })
            break
          case MatchResolveType.Draw:
            this.notificationsService.add({
              type: NotificationType.Action,
              params: [ActionType.Draw, resolve.matchAddress]
            })
            break
        }
      }
    } catch (err) {
      this.notificationsService.add({ type: NotificationType.Error, message: 'ERROR_WRONG_MATCH' })
    }

    return resolves.map(c => c.matchAddress)
  }

  /**
   * Get two match list and return resolve list
   * @param localMatches
   * @param fetchedMatches
   * @private
   */
  private _compareMatches(localMatches: IMatches, fetchedMatches: IMatches): IMatchResolve[] {
    const matchChanges = []

    for (const matchAddress of Object.keys(localMatches)) {
      const localMatch = localMatches[matchAddress]
      const fetchedMatch = fetchedMatches[matchAddress]

      if (!fetchedMatch) {
        continue
      }

      const resolve = this._resolveMatch(localMatch, fetchedMatch)
      if (resolve === MatchResolveType.Nothing) {
        continue
      }

      matchChanges.push({
        resolve,
        matchAddress
      })
    }

    return matchChanges
  }

  private _saveMyMatch(match: IMatch) {
    if (!this.user) {
      return
    }

    // Update matches on local storage
    this._setMatchInStorage(this.user.address, match)
  }

  private _saveMyMove(matchAddress: string, move: Uint8Array) {
    if (!this.user) {
      return
    }

    this._saveMoveToStorage(this.user.address, matchAddress, move)
  }

  private _resolveMatch = (match: IMatch, newMatch: IMatch): MatchResolveType => {
    if (!newMatch) {
      return MatchResolveType.Nothing
    }

    if (match.status === MatchStatus.New &&
        newMatch.status === MatchStatus.Waiting &&
        this.user.address === match.creator.address) {
      return MatchResolveType.Accepted
    }

    if (!match.revealed &&
        newMatch.status === MatchStatus.Waiting &&
        this.user.address === match.creator.address) {
      return MatchResolveType.NeedReveal
    }

    if (newMatch.status === MatchStatus.Waiting &&
        newMatch.reservationHeight - this.currentHeight$.getValue() < -environment.creatorRevealBlocksCount &&
        this.user.address === match.opponent.address) {
      return MatchResolveType.CreatorMissed
    }

    if (match.status !== MatchStatus.Done && newMatch.status === MatchStatus.Done) {

      if (newMatch.result === MatchResult.Opponent) {
        if (match.opponent.address === this.user.address) {
          return MatchResolveType.Won
        } else {
          return MatchResolveType.Lost
        }

      } else if (newMatch.result === MatchResult.Draw) {
        return MatchResolveType.Draw
      }

      if (match.creator.address === this.user.address) {
        return MatchResolveType.Won
      } else {
        return MatchResolveType.Lost
      }
    }

    return MatchResolveType.Nothing
  }

  // TODO: Maybe move this to external storage service

  private _getMatchesFromStorage(userAddress: string): IMatches {
    const allMatches = JSON.parse(localStorage.getItem('matches')) || {}

    return allMatches[userAddress] || {}
  }

  private _setMatchInStorage(userAddress: string, match: IMatch): IMatch {
    const allMatches = JSON.parse(localStorage.getItem('matches')) || {}
    allMatches[userAddress] = allMatches[userAddress] || {}
    allMatches[userAddress][match.address] = match

    localStorage.setItem('matches', JSON.stringify(allMatches))

    return match
  }

  private _getMoveFromStorage(userAddress: string, matchAddress: string): Uint8Array {
    const allMoves = JSON.parse(localStorage.getItem('moves')) || {}
    const moves = allMoves[userAddress] || {}

    if (!moves[matchAddress]) {
      return Uint8Array.from([])
    }

    return base58decode(moves[matchAddress])
  }

  private _saveMoveToStorage(userAddress: string, matchAddress: string, move: Uint8Array): Uint8Array {
    const allMoves = JSON.parse(localStorage.getItem('moves')) || {}
    allMoves[userAddress] = allMoves[userAddress] || {}
    allMoves[userAddress][matchAddress] = base58encode(move)

    localStorage.setItem('moves', JSON.stringify(allMoves))

    return move
  }
}
