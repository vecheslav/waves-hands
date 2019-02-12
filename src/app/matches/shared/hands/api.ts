import { TTx as Tx, IDataTransaction, IMassTransferTransaction, WithId } from '@waves/waves-transactions'
import { IApiConfig } from './config'
import { DataTransaction, MassTransferTransaction, SetScriptTransaction } from './tx-interfaces'
type TTx = Tx & WithId


export interface IHttp {
  get: <T>(url: string) => Promise<T>
  post: <T>(url: string, data: any) => Promise<T>
}

export type DataType = 'binary' | 'integer' | 'boolean' | 'string'

export interface GetMassTransferTxsByKeyParams {
  sender?: string
  recipient?: string
  limit?: number
  timeStart?: number
  timeEnd?: number
}

export interface GetDataTxsByKeyParams {
  key: string
  type?: DataType
  limit?: number
  timeStart?: number
  timeEnd?: number
}

export interface IWavesApi {
  getHeight(): Promise<number>
  getTxById(txId: string): Promise<TTx>
  broadcast(tx: TTx): Promise<TTx>
  broadcastAndWait(tx: Tx): Promise<TTx>
  waitForTx(txId: string): Promise<TTx>
  getDataTxsByKey(params: GetDataTxsByKeyParams): Promise<DataTransaction[]>
  getMassTransfers(params: GetMassTransferTxsByKeyParams): Promise<MassTransferTransaction[]>
  getTxsByAddress(address: string, limit?: number): Promise<TTx[]>
  getSetScriptTxsByScript(script: string, limit?: number): Promise<SetScriptTransaction[]>
  getBalance(address: string): Promise<number>
  config(): IApiConfig
}

export const delay = (millis: number): Promise<{}> =>
  new Promise((resolve, _) => {
    setTimeout(resolve, millis)
  })

const wrapError = (error: any) => {
  let er
  if (error && error.response && error.response.data) {
    switch (error.response.data.error) {
      case 112:
        er = {
          code: 112,
          message: error.response.data.message,
          tx: error.response.data.tx,
        }
        break
      case 199: //script too lagre
        er = {
          code: 199,
          message: error.response.data.message,
        }
        break
      case 306: //error while executing
        er = {
          code: 306,
          message: error.response.data.message,
          tx: error.response.data.transaction,
          vars: error.response.data.vars.reduce((a: [], b: []) => [...a, ...b], []),
        }
        break
      case 307:
        er = {
          code: 307,
          message: error.response.data.message,
          tx: error.response.data.transaction,
          vars: error.response.data.vars.reduce((a: [], b: []) => [...a, ...b], []),
        }
        break
      default:
        er = error
    }

    return er
  }
}

export const retry = async <T>(action: () => Promise<T>, limit: number, delayAfterFail: number): Promise<T> => {
  try {
    return await action()
  } catch (error) {
    const er = wrapError(error)
    if (limit < 1 || er.code) {
      throw er
    }
  }

  await delay(delayAfterFail)
  return await retry(action, limit - 1, delayAfterFail)
}

export const api = (config: IApiConfig, http: IHttp): IWavesApi => {
  const get = <T>(endpoint: string): Promise<T> => retry(() => http.get<T>(config.base + endpoint), 5, 1000)
  const getApi = <T>(endpoint: string): Promise<T> => retry(() => http.get<T>(config.tx + endpoint), 5, 1000)
  const post = <T>(endpoint: string, data: any): Promise<T> => retry(() => http.post<T>(config.base + endpoint, data), 5, 1000)
  const postApi = <T>(endpoint: string, data: any): Promise<T> => retry(() => http.post<T>(config.tx + endpoint, data), 5, 1000)
  const p = (args: any) => Object.entries(args).map(x => x[1] !== undefined ? `&${x[0]}=` + x[1] : '').join('')
  const getHeight = async () =>
    get<{ height: number }>('blocks/last').then(x => x.height)

  const getTxById = async (txId: string): Promise<TTx> =>
    get<TTx>(`transactions/info/${txId}`)

  const broadcast = async (tx: Tx): Promise<TTx & WithId> =>
    post<TTx>('transactions/broadcast', tx)

  const getUtxById = async (txId: string): Promise<TTx> =>
    get<TTx>(`transactions/unconfirmed/info/${txId}`)

  const waitForTx = async (txId: string): Promise<TTx> =>
    retry(() => {
      const tx = getTxById(txId)
      return tx
    }, 500, 1000)

  const getDataTxsByKey = async ({ key, limit, type, timeStart, timeEnd }: GetDataTxsByKeyParams): Promise<DataTransaction[]> =>
    getApi<{ data: { data: DataTransaction }[] }>(`transactions/data?key=${key}&sort=desc${p({ type, timeStart, timeEnd })}&limit=${limit || 100}`).then(x => x.data.map(y => y.data))

  const getMassTransfers = ({ sender, limit, recipient, timeStart, timeEnd }: GetMassTransferTxsByKeyParams): Promise<MassTransferTransaction[]> =>
    getApi<{ data: { data: MassTransferTransaction }[] }>(`transactions/mass-transfer?&sort=desc${p({ sender, recipient, timeStart, timeEnd })}&limit=${limit || 100}`).then(x => x.data.map(y => y.data))

  const getTxsByAddress = async (address: string, limit: number = 100): Promise<TTx[]> =>
    (await get<TTx[][]>(`transactions/address/${address}/limit/${limit}`))[0]

  const broadcastAndWait = async (tx: Tx): Promise<TTx> => {
    const r = await broadcast(tx)
    await waitForTx(r.id)
    return r
  }

  const getBalance = (address: string): Promise<number> =>
    get<{ available: number }>(`addresses/balance/details/${address}`).then(x => x.available)

  const getSetScriptTxsByScript = (script: string, limit: number = 100): Promise<SetScriptTransaction[]> =>
    postApi<{ data: { data: SetScriptTransaction }[] }>('transactions/set-script', {
      script: 'base64:' + script,
      limit,
    }).then(x => x.data.map(y => y.data))

  return {
    getHeight,
    getTxById,
    broadcast,
    waitForTx,
    getDataTxsByKey,
    getTxsByAddress,
    broadcastAndWait,
    getMassTransfers,
    getBalance,
    getSetScriptTxsByScript,
    config: () => config,
  }
}
