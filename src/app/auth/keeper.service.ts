import { Injectable } from '@angular/core'
import { IKeeper, KeeperStatus } from './shared/keeper.interface'
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

  getCurrentPlayer(): Player {
    return { address: 'add12313ress1' }
  }

  async prepareWavesTransfer(recipient: string, amount: number): Promise<any> {
    return await this.keeper.signTransaction({
      type: 4, data: {
        'amount': {
          'assetId': 'WAVES',
          'tokens': (amount / 100000000).toString(),
        },
        'fee': {
          'assetId': 'WAVES',
          'tokens': '0.001',
        },
        'recipient': recipient,
      },
    }).then((x: any) => {
      const data = JSON.parse(x)
      data.fee = parseInt(data.fee.toString(), undefined)
      data.amount = parseInt(data.amount.toString(), undefined)
      return data
    })
  }

  async prepareDataTx(data: DataEntry[], senderPublicKey: string, fee: number): Promise<IDataTransaction> {
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
    }).then((x: IDataTransaction) => {
      x.fee = parseInt(x.fee.toString(), undefined)
      return x
    })
  }
}
