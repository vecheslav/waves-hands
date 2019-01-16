import { Injectable, OnDestroy } from '@angular/core'
import { MatchesHelper } from './shared/matches.helper'
import { HandSign, IMatch, IMatchChange, MatchResolve, MatchResult, MatchStatus } from './shared/match.interface'
import { BehaviorSubject, Observable, timer } from 'rxjs'
import { UserService } from '../user/user.service'
import { IUser } from '../user/user.interface'
import { concatMap, map } from 'rxjs/operators'
import { base58encode, base58decode, publicKey } from 'waves-crypto'
import { transfer } from 'waves-transactions'

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

  private _myMatches: IMatch[] = []
  private _userSubscriber

  private _polledMatches$: Observable<Record<string, IMatch>>
  private _pollingSubscriber

  constructor(private matchesHelper: MatchesHelper,
    private userService: UserService) {

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

    this._pollingSubscriber = this._polledMatches$.subscribe(matches => {
      if (this.matches$.getValue()) {
        this._resolveMatches.call(self, matches)
      }

      this.matches$.next(matches)
    })
  }

  async stopPollingMatches() {
    this._pollingSubscriber.unsubscribe()
  }

  getMatchList(): Promise<Record<string, IMatch>> {
    return this.matchesHelper.getMatchList()
  }

  async getMatch(address: string): Promise<IMatch> {
    const match = await this.matchesHelper.getMatch(address)

    return match
  }

  async createMatch(moves: HandSign[], progress?: (zeroToOne: number) => void): Promise<IMatch> {
    const { move, moveHash, match } = await this.matchesHelper.createMatch(moves, progress)

    this._addMyMatch(match)
    this._saveMove(match.address, move)

    return match
  }

  async joinMatch(match: IMatch, playerPublicKey: string, moves: number[]) {
    const { seed } = await this.matchesHelper.joinMatch(match.publicKey, match.address, moves)

    const { move } = this.matchesHelper.hideMoves(moves)
    this._addMyMatch(match)
    this._saveMove(match.address, move)
  }

  async finishMatch(player1Address: string, player2Address: string, matchPublicKey: string, matchAddress: string, move: Uint8Array) {
    await this.matchesHelper.finishMatch(
      player1Address,
      player2Address,
      matchPublicKey,
      matchAddress,
      move
    )
  }

  private _resolveMatches(newMatches: Record<string, IMatch>) {
    if (!this.user) {
      return
    }

    if (!this._myMatches.length) {
      return
    }

    try {
      const changes = this._getChanges(this._myMatches, newMatches)

      for (const change of changes) {
        switch (change.resolve) {
          case MatchResolve.Accepted:
            const move = this._getMoveFromStorage(change.match.address)
            if (!move) {
              break
            }

            this.finishMatch(
              this.user.address,
              change.match.opponent.address,
              change.match.publicKey,
              change.match.address,
              move
            )
            console.log('Accepted')
            break
          case MatchResolve.Lost:
            console.log('Lost')
            break
          case MatchResolve.Draw:
            console.log('Draw')
            break
          case MatchResolve.Lost:
            console.log('Won')
            break
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  private _preparePayouts(myMatches: Record<string, IMatch>, mySeeds: string[], payoutAddress: string) {
    const keys = mySeeds.map(s => ({ seed: s, pk: publicKey(s) })).reduce((a, b) => ({ ...a, [b.pk]: b.seed }), {})

    return Object.values(myMatches)
      .filter(m => m.opponent &&
        keys[m.opponent.publicKey] !== undefined &&
        m.result === MatchResult.Opponent)                   
      .map(x => transfer({ recipient: payoutAddress, amount: 196300000 - 100000 }, keys[x.opponent.publicKey]))
  }

  private _getChanges(myMatches: IMatch[], matches: Record<string, IMatch>): IMatchChange[] {
    return myMatches.map((match: IMatch) => {
      const newMatch = matches[match.address]

      if (!newMatch) {
        return
      }

      return matchDiff(
        match,
        newMatch
      )
    })
      .filter((change: IMatchChange) => change.resolve !== MatchResolve.Nothing)
  }

  private _addMyMatch(match: IMatch) {
    this._myMatches.push(match)
    this._addMatchToStorage(this.user.address, match)
  }

  private _saveMove(matchAddress: string, move: Uint8Array) {
    this._saveMoveToStorage(matchAddress, move)
  }

  // TODO: Maybe move this to external storage service

  private _getMatchesFromStorage(userAddress: string): IMatch[] {
    const allMatches = JSON.parse(localStorage.getItem('matches')) || {}

    return allMatches[userAddress] || []
  }

  private _addMatchToStorage(userAddress: string, match: IMatch): IMatch {
    const allMatches = JSON.parse(localStorage.getItem('matches')) || {}
    allMatches[userAddress] = allMatches[userAddress] || []
    allMatches[userAddress].push(match)

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
