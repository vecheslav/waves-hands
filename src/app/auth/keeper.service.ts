import { Injectable } from '@angular/core'
import { IKeeper, KeeperStatus, KeeperAuth, KeeperPublicState } from './shared/keeper.interface'
import { TTx, IDataTransaction, data } from '@waves/waves-transactions'
import { KeeperProvider } from './keeper.provider'
import { ErrorCode } from '../shared/error-code'

const handleErrors = async <T>(a: () => Promise<T>): Promise<T> => {
  try {
    return await a()
  } catch (error) {
    console.log(error)
    if (error.code === 9) {
      throw { ... new Error('Wrong address'), code: ErrorCode.WrongAddress }
    }
    if (error.message === 'User denied message') {
      throw { ... new Error('User denied'), code: ErrorCode.UserRejected }
    }
    if (error.code === 3) {
      throw { ... new Error('Wrong address'), code: ErrorCode.WrongAddress }
    }
  }
}

@Injectable()
export class KeeperService implements IKeeper {
  constructor(private keeperProvider: KeeperProvider) {
  }

  get keeperStatus(): KeeperStatus {
    return this.keeperProvider.status
  }

  get keeper(): IKeeper {
    return this.keeperProvider.keeper
  }

  isAvailable(): boolean {
    return this.keeperStatus.isExist
  }

  on(event: string, cb: (state) => void) {
    if (!this.keeper) {
      return
    }
    return this.keeper.on(event, cb)
  }

  async publicState(): Promise<KeeperPublicState> {
    try {
      return await this.keeper.publicState()
    } catch (err) {
      if (err.message === 'Api rejected by user') {
        throw { ... new Error('Api rejected by user'), code: ErrorCode.ApiRejected }
      }
      throw err
    }
  }

  async auth(param?: { data: string }): Promise<KeeperAuth> {
    return await this.keeper.auth(param)
  }

  async signTransaction(p: { type: number, data: any }): Promise<TTx> {
    return await this.keeper.signTransaction(p)
  }

  async prepareDataTransaction(map: Record<string, string | number | boolean | Buffer | Uint8Array | number[]>, senderPublicKey: string): Promise<IDataTransaction> {
    const tx = data({ senderPublicKey: senderPublicKey, data: Object.keys(map).map(key => ({ key, value: map[key] })) })
    const d = {
      type: 12,
      data: {
        data: tx.data,
        fee: {
          'tokens': '0.005',
          'assetId': 'WAVES',
        },
      },
    }

    return await handleErrors(async () => {
      const r = await this.keeper.signTransaction(d).then((x: any) => {
        const res = JSON.parse(x)
        res.fee = parseInt(res.fee.toString(), undefined)
        res.senderPublicKey = senderPublicKey
        return res
      })
      return r
    })
  }

  async prepareWavesTransfer(recipient: string, amount: number, attachment?: string): Promise<any> {
    const d = {
      type: 4, data: {
        'amount': {
          'assetId': 'WAVES',
          'tokens': (amount / 100000000).toString(),
        },
        'attachment': attachment,
        'fee': {
          'assetId': 'WAVES',
          'tokens': '0.001',
        },
        'recipient': recipient,
      },
    }

    return await handleErrors(async () => {
      const r = await this.keeper.signTransaction(d).then((x: any) => {
        const res = JSON.parse(x)
        res.fee = parseInt(res.fee.toString(), undefined)
        res.amount = parseInt(res.amount.toString(), undefined)
        return res
      })
      return r
    })
  }
}
