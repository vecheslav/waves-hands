import { Injectable } from '@angular/core'
import { IKeeper, KeeperStatus } from './shared/keeper.interface'

declare var window: any

@Injectable()
export class KeeperProvider {
  status: KeeperStatus = {
    isExist: false
  }

  private _keeper: IKeeper

  constructor() {
  }

  async init() {
    try {
      // TODO: hack wait init waves keeper
      await new Promise(resolve => setTimeout(resolve, 300))

      this._keeper = this._getKeeper()

      return this.status
    } catch (err) {
      console.error(err)
      return this.status
    }
  }

  get keeper() {
    // if (!this._keeper) {
    //   this._keeper = this._getKeeper()
    // }

    return this._getKeeper()
  }

  private _getKeeper(): IKeeper {
    if (typeof window.Waves !== 'undefined') {
      console.log('Using Keeper detected')
      this.status.isExist = true
      return <IKeeper>(window.Waves)
    } else {
      this.status.isExist = false
      console.warn('No Keeper detected')
    }
  }
}
