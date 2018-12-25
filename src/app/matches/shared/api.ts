import { TTx, IDataTransaction } from 'waves-transactions/transactions'

export type DataTransaction = IDataTransaction & { sender: string }

export interface IHttp {
  get: <T>(url: string) => Promise<T>
  post: <T>(url: string, data: any) => Promise<T>
}

export interface IWavesApi {
  getHeight(): Promise<number>
  getTxById(txId: string): Promise<TTx>
  broadcast(tx: TTx): Promise<TTx>
  waitForTx(txId: string): Promise<TTx>
  findDataTxsByKey(key: string): Promise<DataTransaction[]>
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

export const testnetConfig = {
  base: 'https://testnodes.wavesnodes.com/',
  tx: 'https://api.testnet.wavesplatform.com/v0/'
}

export const api = (config: IConfig, http: IHttp): IWavesApi => {
  const get = <T>(endpoint: string): Promise<T> => retry(() => http.get<T>(config.base + endpoint), 5, 1000)
  const getApi = <T>(endpoint: string): Promise<T> => retry(() => http.get<T>(config.tx + endpoint), 5, 1000)
  const post = <T>(endpoint: string, data: any): Promise<T> => retry(() => http.post<T>(config.base + endpoint, data), 5, 1000)

  const getHeight = async () =>
    get<{ height: number }>('blocks/last').then(x => x.height)

  const getTxById = async (txId: string): Promise<TTx> =>
    get<TTx>(`transactions/info/${txId}`)

  const broadcast = async (tx: TTx): Promise<TTx> =>
    post<TTx>('transactions/broadcast', tx)

  const waitForTx = async (txId: string): Promise<TTx> =>
    retry(() => getTxById(txId), 500, 1000)

  const findDataTxsByKey = async (key: string): Promise<DataTransaction[]> =>
    getApi<{ data: { data: DataTransaction }[] }>(`transactions/data?key=${key}&sort=desc&limit=100`).then(x => x.data.map(y => y.data))

  return {
    getHeight,
    getTxById,
    broadcast,
    waitForTx,
    findDataTxsByKey,
  }
}
