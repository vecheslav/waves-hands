import { Injectable } from '@angular/core'
import { randomBytes } from 'crypto'
import { HandSign, IMatchInfo, PlayerMoves } from './shared/match.interface'
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

  async createMatch(handSigns: HandSign[]): Promise<IMatchInfo> {
    const matchSeed = randomBytes(32).toString('hex')
    const matchSalt = randomBytes(31)
    const matchAddress = address(matchSeed, environment.chainId)
    const tx = await this._keeperService.prepareWavesTransfer(matchAddress, environment.gameBetAmount)

    await this._coreService.broadcastAndWait(tx)

    // transfer complete

    const dataTx = data({
      data: handSigns.map((s, i) => ({
        key: `m1${i + 1}`,
        value: concat([s], matchSalt)
      }))
    })

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


const prepareContract = (moves: PlayerMoves) => {
  const a = `

  `
}
