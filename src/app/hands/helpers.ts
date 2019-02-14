import { IWavesApi } from './api'
import { transfer, data, setScript as setScriptTx, massTransfer } from '@waves/waves-transactions'
import { address } from '@waves/waves-crypto'
import { ITransferTransaction, IMassTransferTransaction, IDataTransaction, ISetScriptTransaction, WithSender, WithId } from '@waves/waves-transactions/dist/transactions'
import { TransferTransaction, DataTransaction, MassTransferTransaction, SetScriptTransaction } from './tx-interfaces'

export interface Seed {
  seed: string
}

export interface PublicKey {
  publicKey: string
}

export interface Address {
  address: string
}

export type Account = Seed | PublicKey | Address

export interface IApiHelpers {
  prepareTransferWaves: (from: Seed | PublicKey, to: Account, amount: number) => ITransferTransaction & WithId
  transferWaves: (from: Seed, to: Account, amount: number) => Promise<TransferTransaction>,
  prepareMassTransferWaves: (from: Seed | PublicKey, to: Record<string, number>, options?: { fee: number }) => IMassTransferTransaction & WithId,
  massTransferWaves: (from: Seed | PublicKey, to: Record<string, number>, options?: { fee: number }) => Promise<MassTransferTransaction>,
  setKeysAndValues: (account: PublicKey | Seed, map: Record<string, string | number | boolean | Buffer | Uint8Array | number[]>) => Promise<DataTransaction>
  setScript: (seed: string, script: string) => Promise<SetScriptTransaction>
}

const isSeed = (account: Account): account is Seed => (<any>account).seed !== undefined
const isPublicKey = (account: Account): account is PublicKey => (<any>account).publicKey !== undefined

const accoutToAddress = (account: Account, chainId: string): string => {
  if (isSeed(account))
    return address(account.seed, chainId)
  if (isPublicKey(account))
    return address({ public: account.publicKey }, chainId)
  return account.address
}

export const apiHelpers = (api: IWavesApi): IApiHelpers => {

  const config = api.config()

  const prepareTransferWaves = (from: Seed | PublicKey, to: Account, amount: number): ITransferTransaction & WithId =>
    isPublicKey(from) ?
      transfer({ amount, recipient: accoutToAddress(to, config.chainId), senderPublicKey: from.publicKey, additionalFee: 400000 }) :
      transfer({ amount, recipient: accoutToAddress(to, config.chainId) }, from.seed)

  const transferWaves = async (from: Seed, to: Account, amount: number): Promise<TransferTransaction> =>
    (await api.broadcastAndWait(prepareTransferWaves(from, to, amount))) as TransferTransaction

  const prepareMassTransferWaves = (from: Seed | PublicKey, to: Record<string, number>, options?: { fee: number }): IMassTransferTransaction & WithId =>
    isPublicKey(from) ?
      massTransfer({ ...options, additionalFee: 400000, senderPublicKey: from.publicKey, transfers: Object.keys(to).map(x => ({ recipient: x, amount: to[x] })) }) :
      massTransfer({ transfers: Object.keys(to).map(x => ({ recipient: x, amount: to[x] })) }, from.seed)

  const massTransferWaves = async (from: Seed | PublicKey, to: Record<string, number>, options?: { fee: number }): Promise<MassTransferTransaction> =>
    (await api.broadcastAndWait(prepareMassTransferWaves(from, to, options))) as MassTransferTransaction

  const setKeysAndValues = async (account: PublicKey | Seed, map: Record<string, string | number | boolean | Buffer | Uint8Array | number[]>): Promise<DataTransaction> => {
    if (isSeed(account)) {
      const tx = data({ data: Object.keys(map).map(key => ({ key, value: map[key] })) }, account.seed)
      return await api.broadcastAndWait(tx) as DataTransaction
    }
    else {
      const tx = data({ additionalFee: 400000, senderPublicKey: account.publicKey, data: Object.keys(map).map(key => ({ key, value: map[key] })) })
      return await api.broadcastAndWait(tx) as DataTransaction
    }
  }

  const setScript = async (seed: string, script: string): Promise<SetScriptTransaction> => {
    const tx = setScriptTx({ script, chainId: config.chainId }, seed)
    return await api.broadcastAndWait(tx) as SetScriptTransaction
  }

  return {
    prepareTransferWaves,
    transferWaves,
    prepareMassTransferWaves,
    massTransferWaves,
    setKeysAndValues,
    setScript,
  }
}
