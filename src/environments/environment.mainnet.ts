import { ChainId } from './chain'

export const environment = {
  production: true,
  gameBetAmount: 100000000,
  defaultFee: 100000,
  chainId: ChainId.Mainnet,
  defaultTimeout: 1000 * 60,
  api: {
    base: 'https://nodes.wavesnodes.com/',
    tx: 'https://api.wavesplatform.com/v0/',
    chainId: ChainId.Mainnet,
  },
  broadcastRetryLimit: 5,
  retryDelay: 2000,
  creatorRevealBlocksCount: 15,
  serviceAddress: '3PFdhb7QmEGHLh8YGHKspAKeeVCEhqxdUfM',
  matchesPollingDelay: 5000,
  bookingServiceEndpoint: 'http://127.0.0.1:3000',
}
