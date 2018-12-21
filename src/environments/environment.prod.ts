import { ChainId } from './chain'

export const environment = {
  production: true,
  gameBetAmount: 100000000,
  chainId: ChainId.Mainnet,
  defaultTimeout: 1000 * 60,
  api: {
    baseEndpoint: 'https://nodes.wavesnodes.com/',
    txEnpoint: 'https://api.wavesplatform.com/v0/'
  },
  broadcastRetryLimit: 10,
  retryDelay: 1000
}
