import { ChainId } from './chain'

export const environment = {
  production: true,
  gameBetAmount: 100000000,
  defaultFee: 100000,
  chainId: ChainId.Mainnet,
  defaultTimeout: 1000 * 60,
  api: {
    baseEndpoint: 'https://nodes.wavesnodes.com/',
    txEnpoint: 'https://api.wavesplatform.com/v0/',
    timeStart: '2019-01-27T14:33:52.388Z'
  },
  broadcastRetryLimit: 10,
  retryDelay: 1000,
  creatorRevealBlocksCount: 15,
  serviceAddress: '3N7oF5J5m9BwBFCmVJZWr3AEH3u4c6CLoB9'
}
