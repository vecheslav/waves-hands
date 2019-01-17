import { Injectable } from '@angular/core'
import { IKeeper, KeeperStatus, KeeperAuth } from './shared/keeper.interface'
import { DataEntry, IDataTransaction } from 'waves-transactions/transactions'
import { Player } from '../matches/shared/match.interface'
import { KeeperProvider } from './keeper.provider'

@Injectable()
export class KeeperService {
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
    return this.keeper.on(event, cb)
  }

  async auth(param?: { data: string }): Promise<KeeperAuth> {
    return await this.keeper.auth(param)
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

    return await this.keeper.signTransaction(d).then((x: any) => {
      const res = JSON.parse(x)
      res.fee = parseInt(res.fee.toString(), undefined)
      res.amount = parseInt(res.amount.toString(), undefined)
      return res
    })
  }

  async prepareDataTx(data: DataEntry[], senderPublicKey: string, fee: number): Promise<any> {
    return await this.keeper.signTransaction({
      type: 12,
      data: {
        fee: {
          assetId: 'WAVES',
          tokens: (fee / 100000000).toString(),
        },
        data,
        senderPublicKey,
      },
    }).then((x: any) => {
      const res = JSON.parse(x)
      res.fee = parseInt(res.fee.toString(), undefined)
      return res
    })
  }
}
