export interface IApiConfig {
  base: string
  tx: string
  chainId: string
}

export const testnetConfig: IApiConfig = {
  base: 'https://testnodes.wavesnodes.com/',
  tx: 'https://api.testnet.wavesplatform.com/v0/',
  chainId: 'T',
}

export const mainnetConfig: IApiConfig = {
  base: 'https://testnodes.wavesnodes.com/',
  tx: 'https://api.testnet.wavesplatform.com/v0/',
  chainId: 'W',
}