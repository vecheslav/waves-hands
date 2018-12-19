import { Injectable } from '@angular/core'
import { IKeeper, KeeperStatus } from './shared/keeper.interface'
import { ITransferTransaction } from 'waves-transactions/transactions'

@Injectable({
  providedIn: 'root'
})
export class KeeperService {
  keeper: IKeeper

  status: KeeperStatus = {
    isExist: false
  }

  constructor() { }

  async init() {
    this.keeper = await this._getKeeper()
    this.status.isExist = true
  }

  private _getKeeper(): IKeeper {
    if (typeof (<any>window).Waves !== 'undefined') {
      console.log('Using Keeper detected')
      return <IKeeper>((<any>window).Waves)
    } else {
      throw new Error('No Keeper detected')
    }
  }

  async prepareWavesTransfer(recipient: string, amount: number): Promise<any> {
    await this._getKeeper().signTransaction({
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
}
