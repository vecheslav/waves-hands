import { Injectable } from '@angular/core'
import { IKeeper, KeeperStatus } from './shared/keeper.interface'

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

  async transferWaves(recipient: string, amount: number): Promise<any> {
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
    }).then(x => {
      x.fee = parseInt(x.fee, undefined)
      x.amount = parseInt(x.amount, undefined)
      return x

    })
  }
}
