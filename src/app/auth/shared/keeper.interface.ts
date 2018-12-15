export interface KeeperAuth {
  address: string,
  data: string,
  host: string,
  prefix: 'WavesWalletAuthentication',
  publicKey: string,
  signature: string
}

export interface IKeeper {
  auth(param?: { data: string }): Promise<KeeperAuth>
  signTransaction(p: { type: number, data: any }): Promise<any>
  transferWaves(recipient: string, amount: number): Promise<any>
}

export interface KeeperStatus {
  isExist: boolean
}
