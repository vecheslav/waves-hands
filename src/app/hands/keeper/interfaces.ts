import { TTx, ITransferTransaction } from '@waves/waves-transactions'

export interface KeeperAuth {
  address: string
  data: string
  host: string
  prefix: 'WavesWalletAuthentication'
  publicKey: string
  signature: string
}

export interface KeeperPublicState {
  initialized: boolean
  locked: boolean
  account?: {
    address: string
    balance: { available: number, leasedOut: number }
    name: string
    networkCode: string
    publicKey: string
    type: string
  }
  network?: {
    code: string
    matcher: string
    server: string
  }
}

export interface IKeeper {
  on(event: string, cb: (state: any) => void): void
  auth(param?: { data: string }): Promise<KeeperAuth>
  signTransaction(p: { type: number, data: any }): Promise<TTx>
  prepareWavesTransfer(recipient: string, amount: number): Promise<ITransferTransaction>
  publicState(): Promise<KeeperPublicState>
}

export interface KeeperStatus {
  isExist: boolean
}