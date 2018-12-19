import { Injectable } from '@angular/core'
import { IKeeper, KeeperStatus } from './shared/keeper.interface'
import { ITransferTransaction, DataEntry, IDataTransaction } from 'waves-transactions/transactions'
import { Player } from '../matches/shared/match.interface'
import { KeeperProvider } from './keeper.provider'

@Injectable()
export class KeeperService {
  keeper: IKeeper
  keeperStatus: KeeperStatus

  constructor(private keeperProvider: KeeperProvider) {
    this.keeperStatus = this.keeperProvider.status

    this.keeper = this.keeperProvider.keeper
  }

  isAvailable() {
    return this.keeperStatus.isExist
  }

  getCurrentPlayer(): Player {
    return { address: 'add12313ress1' }
  }

  async prepareWavesTransfer(recipient: string, amount: number): Promise<ITransferTransaction> {
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
    }).then((x: ITransferTransaction) => {
      x.fee = parseInt(x.fee.toString(), undefined)
      x.amount = parseInt(x.amount.toString(), undefined)
      return x
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
