import { environment } from './game-related/environment'

export interface IApiConfig {
  base: string
  tx: string
  chainId: string
}

export const apiConfig: IApiConfig = {
  base: environment.api.baseEndpoint,
  tx: environment.api.txEnpoint,
  chainId: environment.chainId,
}
