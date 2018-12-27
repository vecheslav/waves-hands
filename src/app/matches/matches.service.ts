import { Injectable } from '@angular/core'
import { MatchesHelper, whoHasWon } from './shared/matches.helper'
import { HandSign, IMatch, MatchStatus, MatchResult } from './shared/match.interface'

const matchDiff = (match: IMatch, newMatch: IMatch) => {

  if (!newMatch) {
    return undefined
  }

  if (match.status === MatchStatus.New && newMatch.status === MatchStatus.Waiting) {
    return `Player ${newMatch.opponent.address} accepted the battle!`
  }
  if (match.status !== MatchStatus.Done && newMatch.status === MatchStatus.Done) {
    if (newMatch.result === MatchResult.Opponent) {
      return `You've lost the battle!`
    } else if (newMatch.result === MatchResult.Draw) {
      return 'The battle is over! Nobody wins! Haha!'
    }
    return `You've won the battle!`
  }

}

const getEvents = (myMatches: IMatch[], matches: Record<string, IMatch>) => {
  return myMatches.map(x => matchDiff(x, matches[x.address]))
    .filter(x => x !== undefined)
}

@Injectable()
export class MatchesService {

  constructor(private matchesHelper: MatchesHelper) {
  }

  async getMatchList(): Promise<IMatch[]> {
    const matches = await this.matchesHelper.getMatchList()

    return matches
  }

  async getMatch(address: string): Promise<IMatch> {
    const match = await this.matchesHelper.getMatch(address)

    return match
  }

  async createMatch(moves: HandSign[], progress?: (zeroToOne: number) => void): Promise<IMatch> {
    const { move, moveHash, match } = await this.matchesHelper.createMatch(moves, progress)

    return match
  }

  async joinMatch(matchPublicKey: string, matchAddress: string, playerPublicKey: string, moves: number[]) {

  }

  async finishMatch(player1Address: string, player2Address: string, matchPublicKey: string, matchAddress: string, move: Uint8Array) {

  }
}
