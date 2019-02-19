import { Injectable } from '@angular/core'
import { KeeperService } from '../../auth/keeper.service'
import { CoreService } from '../../core/core.service'
import { HttpClient } from '@angular/common/http'
import { HandSign, IMatch } from './match.interface'
import '../../hands/extensions'
import { fromAngular } from '../../hands/api-angular'
import { api, IWavesApi } from '../../hands/api'
import { CreateMatchResult, IService, MatchesResult, MatchProgress, service } from '../../hands/game-related/service'
import { environment } from 'src/environments/environment'
import { IKeeper } from '../../../../src/app/auth/shared/keeper.interface'

@Injectable()
export class MatchesHelper {
  private _api: IWavesApi
  private _gameService: IService

  constructor(private keeperService: KeeperService, private core: CoreService, private http: HttpClient) {
    this._api = api(environment.api, fromAngular(http))
    this._gameService = service(this._api, this.keeperService as IKeeper)
  }

  async getMatch(addr: string): Promise<IMatch> {
    const match = await this._gameService.match(addr)
    return match
  }

  async getMatchList(): Promise<MatchesResult> {
    return await this._gameService.matches()
  }

  async create(hands: HandSign[], progress: MatchProgress = () => { }): Promise<CreateMatchResult> {
    return await this._gameService.create(hands, progress)
  }

  async join(match: IMatch, hands: HandSign[], progress: MatchProgress = () => { }): Promise<{ match: IMatch, error: any }> {
    return await this._gameService.join(match, hands, progress)
  }

  async reveal(match: IMatch, move: Uint8Array) {
    return await this._gameService.reveal(match, move)
  }

  async cashback(match: IMatch, paymentId: string) {
    const { cashback: cashbackTx } = await this._gameService.declareCashback(match, paymentId)
    return await this._gameService.cashback(cashbackTx)
  }

  async payout(match: IMatch) {
    const { match: m, payout: payoutTx } = await this._gameService.declarePayout(match)
    return await this._gameService.payout(m, payoutTx)
  }
}
