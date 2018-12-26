import { Injectable } from '@angular/core'
import { MatchesHelper } from './shared/matches.helper'
import { HandSign, IMatch } from './shared/match.interface'

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
