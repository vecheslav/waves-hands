import { Injectable, NgZone, OnDestroy } from '@angular/core'
import { MatchesHelper } from './shared/matches.helper'
import { HandSign, IMatch, IMatchChange, MatchResolve, MatchResult, MatchStatus, PlayerMoves } from './shared/match.interface'
import { BehaviorSubject, Observable, timer } from 'rxjs'
import { UserService } from '../user/user.service'
import { IUser } from '../user/user.interface'
import { concatMap, map } from 'rxjs/operators'
import { base58decode, base58encode } from 'waves-crypto'
import { NotificationsService } from '../notifications/notifications.service'
import { ActionType, NotificationType } from '../notifications/notifications.interface'
import { environment } from 'src/environments/environment'
import { TourService } from '../shared/tour/tour.service'

@Injectable()
export class MatchesService implements OnDestroy {
  matches$ = new BehaviorSubject<Record<string, IMatch>>(null)
  currentMatch$ = new BehaviorSubject<IMatch>(null)

  user: IUser
  currentHeight: number
  updateIsPaused = false

  private _myMatches: Record<string, IMatch> = {}
  private _userSubscriber

  private _polledMatches$: Observable<{ matches: Record<string, IMatch>, currentHeight: number }>
  private _pollingSubscriber

  private _tourSubscriber

  constructor(private matchesHelper: MatchesHelper,
              private userService: UserService,
              private notificationsService: NotificationsService,
              private ngZone: NgZone,
              private tourService: TourService) {
    this._userSubscriber = this.userService.user$.subscribe((user: IUser) => {
      this.user = user
      if (this.user) {
        // Init my matches from storage
        this._myMatches = this._getMatchesFromStorage(this.user.address)
      }
    })

    // Define polling observable
    this._polledMatches$ = timer(0, 5000).pipe(
      concatMap(_ => this.getMatchList()),
      map(res => {
        return res
      })
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
    console.log('Starting polling matches...')
    const self = this

    this.ngZone.runOutsideAngular(() => {
      this._pollingSubscriber = this._polledMatches$.subscribe(res => {
        this.ngZone.run(() => {
          if (this.updateIsPaused) {
            return
          }

          this.currentHeight = res.currentHeight

          if (this.matches$.getValue()) {
            this._resolveMatches.call(self, res.matches)
          }

          if (this.user) {
            for (const match of Object.values(res.matches)) {
              match.owns = match.creator.address === this.user.address
            }
          }
          this.matches$.next(res.matches)
        })
      })
    })
  }

  async stopPollingMatches() {
    this._pollingSubscriber.unsubscribe()
  }

  getMatchList(): Promise<{ matches: Record<string, IMatch>, currentHeight: number }> {
    return this.matchesHelper.getMatchList()
  }

  async getMatch(address: string): Promise<IMatch> {
    const match = await this.matchesHelper.getMatch(address)
    this.currentMatch$.next(match)

    return match
  }

  async createMatch(moves: HandSign[], progress?: (zeroToOne: number) => void): Promise<IMatch> {
    const { move, moveHash, match } = await this.matchesHelper.createMatch(moves, progress)
    this._setMyMatch(match)
    this._saveMove(match.address, move)

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
    this._setMyMatch(match)
    this._saveMove(match.address, move)

    this.notificationsService.add({
      type: NotificationType.Action,
      params: [ActionType.YouJoined, match.address]
    })
  }

  async finishMatch(player1Address: string, player2Address: string, matchPublicKey: string, matchAddress: string, move: Uint8Array) {
    const myMatch = this._myMatches[matchAddress]
    if (!myMatch) {
      return
    }

    // Skip matches with started finishing
    if (myMatch.isFinishing) {
      return
    }

    // Book finish match
    myMatch.isFinishing = true

    console.log('Finish match', matchAddress)
    try {
      await this.matchesHelper.finishMatch(
        player1Address,
        player2Address,
        matchPublicKey,
        matchAddress,
        move
      )
    } catch (err) {
      myMatch.isFinishing = false
      throw err
    }
  }

  async forceFinishMatch(matchAddress: string) {
    const myMatch = this._myMatches[matchAddress]
    if (!myMatch) {
      return
    }

    // Skip matches with started finishing
    if (myMatch.isFinishing) {
      return
    }

    myMatch.isFinishing = true

    console.log('Force finish match', matchAddress)
    try {
      await this.matchesHelper.forceFinish(myMatch)
    } catch (err) {
      myMatch.isFinishing = false
      throw err
    }
  }

  getMyMoves(matchAddress: string): PlayerMoves {
    const moves = this._getMoveFromStorage(this.user.address, matchAddress).slice(0, 3)
    return Array.from(moves) as PlayerMoves
  }

  private _resolveMatches(newMatches: Record<string, IMatch>) {
    if (!this.user) {
      return
    }

    if (!Object.keys(this._myMatches).length) {
      return
    }

    try {
      const changes = this._getChanges(this._myMatches, newMatches)

      for (const change of changes) {
        switch (change.resolve) {
          case MatchResolve.Accepted:
            const move = this._getMoveFromStorage(this.user.address, change.match.address)
            if (!move) {
              break
            }

            if (this.user.address !== change.match.creator.address) {
              break
            }

            this.notificationsService.add({
              type: NotificationType.Action,
              params: [ActionType.OpponentJoined, change.match.address]
            })

            this.finishMatch(
              this.user.address,
              change.match.opponent.address,
              change.match.publicKey,
              change.match.address,
              move
            )
            break
          case MatchResolve.CreatorMissed:
            if (this.user.address === change.match.creator.address) {
              break
            }
            this.forceFinishMatch(change.match.address)
            break
          case MatchResolve.OpponentWon:
            if (change.match.opponent.address === this.user.address) {
              this.notificationsService.add({
                type: NotificationType.Action,
                params: [ActionType.Won, change.match.address]
              })
            } else {
              this.notificationsService.add({
                type: NotificationType.Action,
                params: [ActionType.Lost, change.match.address]
              })
            }
            break
          case MatchResolve.Draw:
            this.notificationsService.add({
              type: NotificationType.Action,
              params: [ActionType.Draw, change.match.address]
            })
            break
          case MatchResolve.CreatorWon:
            if (change.match.creator.address === this.user.address) {
              this.notificationsService.add({
                type: NotificationType.Action,
                params: [ActionType.Won, change.match.address]
              })
            } else {
              this.notificationsService.add({
                type: NotificationType.Action,
                params: [ActionType.Lost, change.match.address]
              })
            }
            break
        }

        if (change.match) {
          // Apply my match
          this._setMyMatch(change.match)

          const currentMatch = this.currentMatch$.getValue()
          if (currentMatch.address === change.match.address) {
            this.currentMatch$.next(change.match)
          }
        }
      }
    } catch (err) {
      console.error(err)
      this.notificationsService.add({ type: NotificationType.Error, message: 'ERROR_WRONG_MATCH'})
    }
  }

  private _getChanges(myMatches: Record<string, IMatch>, matches: Record<string, IMatch>): IMatchChange[] {
    const matchChanges = []
    for (const matchAddress of Object.keys(myMatches)) {
      const match = myMatches[matchAddress]
      const newMatch = matches[matchAddress]

      if (!newMatch) {
        continue
      }

      matchChanges.push(matchDiff(match, newMatch, this.currentHeight))
    }

    return matchChanges.filter((change: IMatchChange) => change.resolve !== MatchResolve.Nothing)
  }

  private _setMyMatch(match: IMatch) {
    // Save temp values
    const { isFinishing } = this._myMatches[match.address] || { isFinishing: false }

    this._myMatches[match.address] = match

    // Restore temp values
    this._myMatches[match.address] = { ...this._myMatches[match.address], isFinishing }

    this._setMatchInStorage(this.user.address, match)
  }

  private _saveMove(matchAddress: string, move: Uint8Array) {
    this._saveMoveToStorage(this.user.address, matchAddress, move)
  }

  // TODO: Maybe move this to external storage service

  private _getMatchesFromStorage(userAddress: string): Record<string, IMatch> {
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

const matchDiff = (match: IMatch, newMatch: IMatch, currentHeight: number): IMatchChange => {
  if (!newMatch) {
    return {
      resolve: MatchResolve.Nothing,
    }
  }

  if (match.status === MatchStatus.New && newMatch.status === MatchStatus.Waiting) {
    return {
      resolve: MatchResolve.Accepted,
      message: `Player ${newMatch.opponent.address} accepted the battle!`,
      match: newMatch,
    }
  }

  if (newMatch.status === MatchStatus.Waiting &&
    newMatch.reservationHeight - currentHeight < -environment.creatorRevealBlocksCount) {
    return {
      resolve: MatchResolve.CreatorMissed,
      match: newMatch
    }
  }

  if (match.status !== MatchStatus.Done && newMatch.status === MatchStatus.Done) {
    if (newMatch.result === MatchResult.Opponent) {
      return {
        resolve: MatchResolve.OpponentWon,
        message: 'You\'ve lost the battle!',
        match: newMatch,
      }
    } else if (newMatch.result === MatchResult.Draw) {
      return {
        resolve: MatchResolve.Draw,
        message: 'The battle is over! Nobody wins! Haha!',
        match: newMatch,
      }
    }

    return {
      resolve: MatchResolve.CreatorWon,
      message: 'You\'ve won the battle!',
      match: newMatch,
    }
  }

  return {
    resolve: MatchResolve.Nothing,
  }
}
