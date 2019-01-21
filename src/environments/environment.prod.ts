import { ChainId } from './chain'

export const environment = {
  production: true,
  gameBetAmount: 100000000,
  chainId: ChainId.Testnet,
  defaultTimeout: 1000 * 60,
  api: {
    baseEndpoint: 'https://testnodes.wavesnodes.com/',
    txEnpoint: 'https://api.testnet.wavesplatform.com/v0/'
  },
  broadcastRetryLimit: 10,
  retryDelay: 1000,
  creatorRevealBlocksCount: 4,
  serviceAddress: '3N7oF5J5m9BwBFCmVJZWr3AEH3u4c6CLoB9'
}
