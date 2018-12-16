import { Injectable } from '@angular/core'
import { address, concat, base58encode, blake2b, base58decode } from 'waves-crypto'
import { randomBytes } from 'crypto'
import { HandSign, IMatchInfo } from './shared/match.interface'
import { environment } from '../../environments/environment'
import { data, setScript } from 'waves-transactions'
import { KeeperService } from '../auth/keeper.service'



@Injectable({
  providedIn: 'root'
})
export class MatchesService {

  _keeperService: KeeperService

  constructor(keeper: KeeperService) {
    this._keeperService = keeper
  }

  async createMatch(handSigns: HandSign[]): Promise<IMatchInfo> {
    const matchSeed = randomBytes(32).toString('hex')
    const matchSalt = randomBytes(31)
    const matchAddress = address(matchSeed, environment.chainId)
    const tx = await this._keeperService.transferWaves(matchAddress, environment.gameBetAmount)

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
