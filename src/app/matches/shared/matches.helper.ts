import { Injectable } from '@angular/core'
import { KeeperService } from '../../auth/keeper.service'
import { CoreService } from '../../core/core.service'
import { HttpClient } from '@angular/common/http'
import { Match, HandSign } from './match.interface'
import '../../hands/extensions'
import { fromAngular } from '../../hands/api-angular'
import { api, IWavesApi } from '../../hands/api'
import { CreateMatchResult, MatchProgress, service } from '../../hands/game-related/service'
import { IKeeper } from '../../hands/keeper/interfaces'
import { environment } from 'src/environments/environment'

@Injectable()
export class MatchesHelper {
  private _api: IWavesApi
  private _gameService

  constructor(private keeperService: KeeperService, private core: CoreService, private http: HttpClient) {
    this._api = api(environment.api, fromAngular(http))
    this._gameService = service(this._api, this.keeperService as IKeeper)
  }

  async getMatch(addr: string): Promise<Match> {
    return await this._gameService.match(addr)
  }

  async getMatchList(): Promise<{ matches: Record<string, Match>, currentHeight: number }> {
    const currentHeight = await this._api.getHeight()
    const a = await this._gameService.matches()
    return { matches: (a).toRecord(x => x.address), currentHeight }
  }

  async create(hands: HandSign[], progress: MatchProgress = () => {}): Promise<CreateMatchResult> {
    return await this._gameService.create(hands, progress)
  }

  async join(match: Match, hands: HandSign[], progress: MatchProgress = () => {}): Promise<Match> {
    return await this._gameService.join(match, hands, progress)
  }

  async reveal(match: Match, move: Uint8Array) {
    return await this._gameService.reveal(match, move)
  }

  async payout(match: Match, move?: Uint8Array) {
    return await this._gameService.payout(match)
  }
}
