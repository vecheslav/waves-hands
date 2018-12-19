import { ITransferTransaction, TTx } from 'waves-transactions/transactions'

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
  signTransaction(p: { type: number, data: any }): Promise<TTx>
  prepareWavesTransfer(recipient: string, amount: number): Promise<ITransferTransaction>
}

export interface KeeperStatus {
  isExist: boolean
}
