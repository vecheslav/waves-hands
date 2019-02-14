import { TTx, ITransferTransaction, IDataTransaction } from '@waves/waves-transactions'
import { Seed, PublicKey } from '../helpers'

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

interface prepareDataTransactionParams {

}



export interface KeeperStatus {
  isExist: boolean
}