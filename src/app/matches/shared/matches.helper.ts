import { Injectable } from '@angular/core'
import { KeeperService } from '../../auth/keeper.service'
import { CoreService } from '../../core/core.service'
import { HttpClient } from '@angular/common/http'
import { IMatch, EmptyMatch, HandSign } from './match.interface'
import './extensions'
import { fromAngular } from './hands/api-angular'
import { api, IWavesApi } from './hands/api'
import { CreateMatchResult, service } from './hands/game-related/service'
import { IKeeper } from './hands/keeper/interfaces'
import { environment } from 'src/environments/environment'

@Injectable()
export class MatchesHelper {
  private _api: IWavesApi
  private _gameService

  constructor(private keeperService: KeeperService, private core: CoreService, private http: HttpClient) {
    this._api = api(environment.api, fromAngular(http))
    this._gameService = service(this._api, this.keeperService as IKeeper)
  }

  async getMatch(addr: string): Promise<IMatch> {
    return Promise.resolve(EmptyMatch)
  }

  async getMatchList(): Promise<{ matches: Record<string, IMatch>, currentHeight: number }> {
    return Promise.resolve({ matches: { '': EmptyMatch }, currentHeight: 0 })
  }

  async create(hands: HandSign[], progress: (zeroToOne: number) => void = () => { }): Promise<CreateMatchResult> {
    return await this._gameService.create(hands)
  }

  async join(match: IMatch, hands: HandSign[], progress: (zeroToOne: number) => void = () => { }): Promise<IMatch> {
    return await this._gameService.join(match, hands)
  }

  async reveal(match: IMatch, move: Uint8Array) {
    return await this._gameService.reveal(match, move)
  }

  async payout(match: IMatch, move?: Uint8Array) {
    return await this._gameService.payout(match)
  }
}
