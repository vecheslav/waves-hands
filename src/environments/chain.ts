export enum ChainId {
  Mainnet = 'W',
  Testnet = 'T'
}

export const chains = {
  'W': {
    nodeUri: 'https://nodes.wavesnodes.com',
  },
  'T': {
    nodeUri: 'https://testnodes.wavesnodes.com',
  }
}
