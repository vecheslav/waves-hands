import { ChainId } from './chain'

export const environment = {
  production: true,
  gameBetAmount: 100000000,
  chainId: ChainId.Mainnet,
  defaultTimeout: 1000 * 60,
  apiEndpoint: 'https://nodes.wavesnodes.com/',
  broadcastRetryLimit: 10,
  retryDelay: 1000
}
