import { IMassTransferTransaction, ITransferTransaction, IDataTransaction, ISetScriptTransaction } from '@waves/waves-transactions'

interface TxExtension {
  id: string,
  sender: string
}

export type MassTransferTransaction = IMassTransferTransaction & TxExtension
export type TransferTransaction = ITransferTransaction & TxExtension
export type DataTransaction = IDataTransaction & TxExtension
export type SetScriptTransaction = ISetScriptTransaction & TxExtension