import { TTx, IDataTransaction, IMassTransferTransaction, ISetScriptTransaction } from 'waves-transactions/transactions'
import { environment } from 'src/environments/environment'

export type DataTransaction = IDataTransaction & { sender: string }
export type MassTransferTransaction = IMassTransferTransaction & { sender: string }
export type SetScriptTransaction = ISetScriptTransaction & { sender: string }

export interface IHttp {
  get: <T>(url: string) => Promise<T>
  post: <T>(url: string, data: any) => Promise<T>
}

export interface IWavesApi {
  getHeight(): Promise<number>
  getTxById(txId: string): Promise<TTx>
  broadcast(tx: TTx): Promise<TTx>
  broadcastAndWait(tx: TTx): Promise<TTx>
  waitForTx(txId: string): Promise<TTx>
  getDataTxsByKey(key: string, limit?: number): Promise<DataTransaction[]>
  getSetScriptTxsByAddress(address: string, limit?: number): Promise<SetScriptTransaction[]>
  getSetScriptTxsByScript(script: string, limit?: number): Promise<SetScriptTransaction[]>
  getTxsByAddress(address: string, limit?: number): Promise<TTx[]>
  getMassTransfersByRecipient(recipient: string): Promise<MassTransferTransaction[]>
  getBalance(address: string): Promise<number>
}


export const delay = (millis: number): Promise<{}> =>
  new Promise((resolve, _) => {
    setTimeout(resolve, millis)
  })

export const retry = async <T>(action: () => Promise<T>, limit: number, delayAfterFail: number) => {
  try {
    return await action()
  } catch (error) {
    if (limit < 1) {
      throw error
    }

    await delay(delayAfterFail)
    return await retry(action, limit - 1, delayAfterFail)
  }
}

export interface IConfig {
  base: string,
  tx: string,
}

export const apiConfig = {
  base: environment.api.baseEndpoint,
  tx: environment.api.txEnpoint
}

export const api = (config: IConfig, http: IHttp): IWavesApi => {
  const get = <T>(endpoint: string): Promise<T> => retry(() => http.get<T>(config.base + endpoint), 5, 1000)
  const getApi = <T>(endpoint: string): Promise<T> => retry(() => http.get<T>(config.tx + endpoint + '&timeStart=' + environment.api.timeStart), 5, 1000)
  const post = <T>(endpoint: string, data: any): Promise<T> => retry(() => http.post<T>(config.base + endpoint, data), 5, 1000)
  const postApi = <T>(endpoint: string, data: any): Promise<T> => retry(() => http.post<T>(config.tx + endpoint, data), 5, 1000)

  const getHeight = async () =>
    get<{ height: number }>('blocks/last').then(x => x.height)

  const getTxById = async (txId: string): Promise<TTx> =>
    get<TTx>(`transactions/info/${txId}`)

  const broadcast = async (tx: TTx): Promise<TTx> =>
    post<TTx>('transactions/broadcast', tx)

  const waitForTx = async (txId: string): Promise<TTx> =>
    retry(() => getTxById(txId), 500, 1000)

  const getDataTxsByKey = async (key: string, limit: number = 100): Promise<DataTransaction[]> =>
    getApi<{ data: { data: DataTransaction }[] }>(`transactions/data?key=${key}&sort=desc&limit=${limit}`).then(x => x.data.map(y => y.data))

  const getTxsByAddress = async (address: string, limit: number = 100): Promise<TTx[]> =>
    (await get<TTx[][]>(`transactions/address/${address}/limit/${limit}`))[0]

  const broadcastAndWait = async (tx: TTx): Promise<TTx> => {
    const r = await broadcast(tx)
    await waitForTx(r.id)
    return r
  }

  const getMassTransfersByRecipient = (recipient: string, limit: number = 100): Promise<MassTransferTransaction[]> =>
    getApi<{ data: { data: MassTransferTransaction }[] }>(`transactions/mass-transfer?recipient=${recipient}&sort=desc&limit=${limit}`).then(x => x.data.map(y => y.data))

  const getSetScriptTxsByAddress = (address: string, limit: number = 100): Promise<SetScriptTransaction[]> =>
    getApi<{ data: { data: SetScriptTransaction }[] }>(`transactions/set-script?sender=${address}&sort=desc&limit=${limit}`).then(x => x.data.map(y => y.data))

  const getSetScriptTxsByScript = (script: string, limit: number = 100): Promise<SetScriptTransaction[]> => {
    const data = {
      script: script,
      limit,
    }
    return postApi<{ data: { data: SetScriptTransaction }[] }>(`transactions/set-script`, data).then(x => x.data.map(y => y.data))
  }

  const getBalance = (address: string): Promise<number> =>
    get<{ available: number }>(`addresses/balance/details/${address}`).then(x => x.available)


  return {
    getHeight,
    getTxById,
    broadcast,
    waitForTx,
    getDataTxsByKey,
    getTxsByAddress,
    broadcastAndWait,
    getMassTransfersByRecipient,
    getSetScriptTxsByAddress,
    getSetScriptTxsByScript,
    getBalance,
  }
}
