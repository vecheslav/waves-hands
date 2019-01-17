import { Injectable, OnDestroy } from '@angular/core'
import { MatchesHelper } from './shared/matches.helper'
import { HandSign, IMatch, IMatchChange, MatchResolve, MatchResult, MatchStatus, PlayerMoves } from './shared/match.interface'
import { BehaviorSubject, Observable, timer } from 'rxjs'
import { UserService } from '../user/user.service'
import { IUser } from '../user/user.interface'
import { concatMap, map } from 'rxjs/operators'
import { base58encode, base58decode } from 'waves-crypto'
import { ActionsService } from '../actions/actions.service'
import { ActionType } from '../actions/actions.interface'

const matchDiff = (match: IMatch, newMatch: IMatch): IMatchChange => {
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

  if (match.status !== MatchStatus.Done && newMatch.status === MatchStatus.Done) {
    if (newMatch.result === MatchResult.Opponent) {
      return {
        resolve: MatchResolve.Lost,
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
      resolve: MatchResolve.Won,
      message: 'You\'ve won the battle!',
      match: newMatch,
    }
  }

  return {
    resolve: MatchResolve.Nothing,
  }
}

@Injectable()
export class MatchesService implements OnDestroy {
  matches$ = new BehaviorSubject<Record<string, IMatch>>(null)
  user: IUser

  private _myMatches: Record<string, IMatch> = {}
  private _userSubscriber

  private _polledMatches$: Observable<{ matches: Record<string, IMatch>, currentHeight: number }>
  private _pollingSubscriber

  constructor(private matchesHelper: MatchesHelper,
    private userService: UserService,
    private actionsService: ActionsService) {
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
  }

  ngOnDestroy() {
    this._userSubscriber.unsubscribe()
  }

  async startPollingMatches() {
    console.log('Starting polling matches...')
    const self = this

    this._pollingSubscriber = this._polledMatches$.subscribe(r => {
      if (this.matches$.getValue()) {
        this._resolveMatches.call(self, r.matches, r.currentHeight)
      }

      for (const match of Object.values(r.matches)) {
        match.owns = match.creator.address === this.user.address
      }
      this.matches$.next(r.matches)
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

    return match
  }

  async createMatch(moves: HandSign[], progress?: (zeroToOne: number) => void): Promise<IMatch> {
    const { move, moveHash, match } = await this.matchesHelper.createMatch(moves, progress)

    this._setMyMatch(match)
    this._saveMove(match.address, move)

    this.actionsService.add({ type: ActionType.CreatedMatch, args: [match.address] })

    return match
  }

  async joinMatch(match: IMatch, playerPublicKey: string, moves: number[]) {
    await this.matchesHelper.joinMatch(match.publicKey, match.address, moves)

    const { move } = this.matchesHelper.hideMoves(moves)
    this._setMyMatch(match)
    this._saveMove(match.address, move)

    this.actionsService.add({ type: ActionType.JoinedMatch, args: [match.address] })
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

  getMyMoves(matchAddress: string): PlayerMoves {
    const moves = this._getMoveFromStorage(matchAddress).slice(0, 3)
    return Array.from(moves) as PlayerMoves
  }

  private _resolveMatches(newMatches: Record<string, IMatch>, currentHeight: number) {
    if (!this.user) {
      return
    }

    if (!Object.keys(this._myMatches).length) {
      return
    }

    try {

      Object.values(this._myMatches)
        .filter(m => m.status === MatchStatus.Waiting && m.reservationHeight - currentHeight < -15)
        .forEach(async m => {
          m.isFinishing = true
          m.status = MatchStatus.Done
          m.result = MatchResult.Opponent

          try {
            await this.matchesHelper.forceFinish(m)
          } catch (error) {
          }
        })

      const changes = this._getChanges(this._myMatches, newMatches)

      for (const change of changes) {
        switch (change.resolve) {
          case MatchResolve.Accepted:
            const move = this._getMoveFromStorage(change.match.address)
            if (!move) {
              break
            }

            if (this.user.address !== change.match.creator.address) {
              break
            }

            this.actionsService.add({ type: ActionType.AcceptedMatch, args: [change.match.address] })

            this.finishMatch(
              this.user.address,
              change.match.opponent.address,
              change.match.publicKey,
              change.match.address,
              move
            )

            this.actionsService.add({ type: ActionType.FinishedMatch, args: [change.match.address] })

            break
          case MatchResolve.Lost:
            this.actionsService.add({ type: ActionType.LostMatch, args: [change.match.address] })
            break
          case MatchResolve.Draw:
            this.actionsService.add({ type: ActionType.DrawMatch, args: [change.match.address] })
            break
          case MatchResolve.Won:
            this.actionsService.add({ type: ActionType.WonMatch, args: [change.match.address] })
            break
        }

        // Apply my match
        this._setMyMatch(change.match)
      }
    } catch (err) {
      console.error(err)
      this.actionsService.add({ type: ActionType.WrongMatch })
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

      matchChanges.push(matchDiff(match, newMatch))
    }

    return matchChanges.filter((change: IMatchChange) => change.resolve !== MatchResolve.Nothing)
  }

  private _setMyMatch(match: IMatch) {
    this._myMatches[match.address] = match
    this._setMatchInStorage(this.user.address, match)
  }

  private _saveMove(matchAddress: string, move: Uint8Array) {
    this._saveMoveToStorage(matchAddress, move)
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

  private _getMoveFromStorage(matchAddress: string): Uint8Array {
    const moves = JSON.parse(localStorage.getItem('moves')) || {}

    return base58decode(moves[matchAddress])
  }

  private _saveMoveToStorage(matchAddress: string, move: Uint8Array): Uint8Array {
    const moves = JSON.parse(localStorage.getItem('moves')) || {}
    moves[matchAddress] = base58encode(move)

    localStorage.setItem('moves', JSON.stringify(moves))

    return move
  }
}
