import { ChainId } from './chain'

export const environment = {
  production: true,
  gameBetAmount: 100000000,
  defaultFee: 100000,
  chainId: ChainId.Testnet,
  defaultTimeout: 1000 * 60,
  api: {
    base: 'https://testnodes.wavesnodes.com/',
    tx: 'https://api.testnet.wavesplatform.com/v0/',
    chainId: ChainId.Testnet,
  },
  broadcastRetryLimit: 5,
  retryDelay: 2000,
  creatorRevealBlocksCount: 4,
  serviceAddress: '3N7oF5J5m9BwBFCmVJZWr3AEH3u4c6CLoB9',
  matchesPollingDelay: 5000,
  bookingServiceEndpoint: 'http://127.0.0.1:3000',
}
