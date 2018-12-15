import { Injectable } from '@angular/core';
import { randomBytes } from 'crypto'
import { HandSigns, IMatchInfo } from './shared/match.interface'
import { address, concat, base58encode } from 'waves-crypto'
import { environment } from '../../environments/environment'
import { data, setScript } from 'waves-transactions'

@Injectable({
  providedIn: 'root'
})
export class MatchesService {

  constructor() { }

  async createMatch(handSigns: HandSigns): Promise<IMatchInfo> {
    const matchSeed  = randomBytes(32).toString('hex')
    const matchSalt = randomBytes(31)
    const matchAddress = address(matchSeed, environment.chainId)
    // const tx = await keeper.transferWaves(matchAddress, environment.gameBetAmount)

    // wait tx

    const dataTx = data({
      data: handSigns.map((s, i) => ({
        key: `m1${i + 1}`,
        value: concat([s], matchSalt)
      }))
    })

    // broadcast
    // wait
    return {
      address: matchAddress,
      timestamp: 123,
      salt: base58encode(matchSalt)
    }
  }

  async getMatchList(): Promise<IMatchInfo[]> {
    return []
  }
}
