import { TTx as Tx, WithId } from '@waves/waves-transactions'
import { IApiConfig } from './config'
import { DataTransaction, MassTransferTransaction, SetScriptTransaction } from './tx-interfaces'
import { randomBytes } from 'crypto'
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
  getUtx(): Promise<TTx[]>
  getSetScriptTxsByScript(script: string, limit?: number): Promise<SetScriptTransaction[]>
  getBalance(address: string): Promise<number>
  config(): IApiConfig
  start(): string
  end(id: string)
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
          tx: JSON.stringify(error.response.data.transaction),
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
    if (limit < 1 || (er && er.code)) {
      throw er
    }
  }

  await delay(delayAfterFail)
  return await retry(action, limit - 1, delayAfterFail)
}

export const api = (config: IApiConfig, h: IHttp): IWavesApi => {

  const allTxs: Record<string, TTx> = {}
  const sessions: Record<string, string[]> = {}

  const http = {
    get: <T>(url: string): Promise<T> => {
      //console.log(url)
      return h.get(url)
    },
    post: <T>(url: string, data: any): Promise<T> => {
      //console.log(url)
      //console.log(data)
      if (data.id && data.type) {
        allTxs[data.id] = data as TTx
      }
      return h.post(url, data)
    },
  }

  const start = (): string => {
    const id = randomBytes(32).toString('hex')
    sessions[id] = []
    return id
  }

  const end = (id: string) => {
    delete sessions[id]
  }


  const get = <T>(endpoint: string): Promise<T> => retry(() => http.get<T>(config.base + endpoint), 5, 1000)
  const getApi = <T>(endpoint: string): Promise<T> => retry(() => http.get<T>(config.tx + endpoint), 5, 1000)
  const post = <T>(endpoint: string, data: any): Promise<T> => retry(() => http.post<T>(config.base + endpoint, data), 5, 1000)
  const postApi = <T>(endpoint: string, data: any): Promise<T> => retry(() => http.post<T>(config.tx + endpoint, data), 5, 1000)
  const p = (args: any) => Object.entries(args).map(x => x[1] !== undefined ? `&${x[0]}=` + x[1] : '').join('')

  const getHeight = async () =>
    get<{ height: number }>('blocks/last').then(x => x.height)

  const getTxById = async (txId: string): Promise<TTx> =>
    get<TTx>(`transactions/info/${txId}`)

  const getUtxById = async (txId: string): Promise<TTx> =>
    get<TTx>(`transactions/unconfirmed/info/${txId}`)

  const broadcast = async (tx: Tx): Promise<TTx & WithId> =>
    post<TTx>('transactions/broadcast', tx)

  const waitForTx = async (txId: string, sessionId: string = undefined): Promise<TTx> => {
    try {
      const tx = await retry(async () => getTxById(txId), 10, 1000)
      if (sessionId)
        sessions[sessionId].push(txId)
      return tx
    } catch (error) {
      if (error.code === 307 && sessionId) {
        const id = sessions[sessionId].pop()
        let exists = false
        try {
          await getTxById(id)
          exists = true
        } catch (error) {
          exists = false
        }

        if (exists) {
          if (sessionId)
            end(sessionId)
          throw error
        }

        try {
          await getUtxById(id)
          exists = true
        } catch (error) {

          exists = false
        }

        if (exists) return waitForTx(txId, sessionId)

        const tx = allTxs[id]

        return broadcastAndWait(tx, sessionId)

      } else {
        try {
          const tx = await getUtxById(txId)
          return waitForTx(txId, sessionId)
        } catch (error) {
          if (sessionId)
            end(sessionId)
          throw error
        }
      }
    }
  }

  const getDataTxsByKey = async ({ key, limit, type, timeStart, timeEnd }: GetDataTxsByKeyParams): Promise<DataTransaction[]> =>
    getApi<{ data: { data: DataTransaction }[] }>(`transactions/data?key=${key}&sort=desc${p({ type, timeStart, timeEnd })}&limit=${limit || 100}`).then(x => x.data.map(y => y.data))

  const getMassTransfers = ({ sender, limit, recipient, timeStart, timeEnd }: GetMassTransferTxsByKeyParams): Promise<MassTransferTransaction[]> =>
    getApi<{ data: { data: MassTransferTransaction }[] }>(`transactions/mass-transfer?&sort=desc${p({ sender, recipient, timeStart, timeEnd })}&limit=${limit || 100}`).then(x => x.data.map(y => y.data))

  const getTxsByAddress = async (address: string, limit: number = 100): Promise<TTx[]> =>
    (await get<TTx[][]>(`transactions/address/${address}/limit/${limit}`))[0]

  const broadcastAndWait = async (tx: Tx, sessionId: string = undefined): Promise<TTx> => {
    const r = await broadcast(tx)
    await waitForTx(r.id, sessionId)
    return r
  }

  const getUtx = (): Promise<TTx[]> =>
    get<TTx[]>('transactions/unconfirmed')

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
    getUtx,
    getSetScriptTxsByScript,
    config: () => config,
    start,
    end,
  }
}
