import { Injectable } from '@angular/core'
import { randomBytes } from 'crypto'
import { HandSigns, IMatchInfo } from './shared/match.interface'
import { address, concat, base58encode } from 'waves-crypto'
import { environment } from '../../environments/environment'
import { data } from 'waves-transactions'
import { KeeperService } from '../auth/keeper.service'
import { CoreService } from '../core/core.service'

@Injectable({
  providedIn: 'root'
})
export class MatchesService {
  _keeperService: KeeperService
  _coreService: CoreService

  constructor(keeper: KeeperService, core: CoreService) {
    this._keeperService = keeper
    this._coreService = core
  }

  async createMatch(handSigns: HandSigns): Promise<IMatchInfo> {
    const matchSeed = randomBytes(32).toString('hex')
    const matchSalt = randomBytes(31)
    const matchAddress = address(matchSeed, environment.chainId)
    const tx = await this._keeperService.transferWaves(matchAddress, environment.gameBetAmount)

    await this._coreService.broadcastAndWait(tx)
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
