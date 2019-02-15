import { Injectable } from '@angular/core'
import { KeeperService } from '../../auth/keeper.service'
import { CoreService } from '../../core/core.service'
import { HttpClient } from '@angular/common/http'
import { Match, HandSign, IMatch } from './match.interface'
import '../../hands/extensions'
import { fromAngular } from '../../hands/api-angular'
import { api, IWavesApi } from '../../hands/api'
import { CreateMatchResult, IService, MatchProgress, service } from '../../hands/game-related/service'
import { environment } from 'src/environments/environment'
import { IKeeper } from '../../../../src/app/auth/shared/keeper.interface'

export interface CreateMatchPlainResult {
  move: Uint8Array
  moveHash: Uint8Array
  match: IMatch
}

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
    return Match.toPlain(match)
  }

  async getMatchList(): Promise<{ matches: Record<string, IMatch>, currentHeight: number }> {
    const currentHeight = await this._api.getHeight()
    const a = await this._gameService.matches()
    return {
      matches: (a)
        .map(m => Match.toPlain(m))
        .toRecord(x => x.address),
      currentHeight,
    }
  }

  async create(hands: HandSign[], progress: MatchProgress = () => { }): Promise<CreateMatchPlainResult> {
    const res = await this._gameService.create(hands, progress)
    return {
      ...res,
      match: Match.toPlain(res.match),
    }
  }

  async join(match: IMatch, hands: HandSign[], progress: MatchProgress = () => { }): Promise<IMatch> {
    const m = await this._gameService.join(Match.create(match), hands, progress)
    return Match.toPlain(m)
  }

  async reveal(match: IMatch, move: Uint8Array) {
    return await this._gameService.reveal(Match.create(match), move)
  }

  async cashback(match: IMatch, paymentId: string) {
    const { cashback: cashbackTx } = await this._gameService.declareCashback(Match.create(match), paymentId)
    return await this._gameService.cashback(cashbackTx)
  }

  async payout(match: IMatch) {
    const { match: m, payout: payoutTx } = await this._gameService.declarePayout(Match.create(match))
    return await this._gameService.payout(m, payoutTx)
  }
}
