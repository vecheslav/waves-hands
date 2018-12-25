export interface IHttp {
  get: <T>(url: string) => Promise<T>
  post: <T>(url: string, data: any) => Promise<T>
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

const api = (config: IConfig, http: IHttp) => {
  const get = <T>(endpoint: string) => retry(() => http.get<T>(config.base + endpoint), 5, 1000)
  return {
    getHeight: async () => {
      await get<{ height: number }>('blocks/last')
    }
  }
}
