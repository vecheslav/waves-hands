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
      await new Promise(resolve => setTimeout(resolve, 200))

      this._keeper = this._getKeeper()
      this.status.isExist = true

      return this.status
    } catch (err) {
      console.error(err)
      return this.status
    }
  }

  get keeper() {
    if (!this._keeper) {
      this._keeper = this._getKeeper()
    }

    return this._keeper
  }

  private _getKeeper(): IKeeper {
    if (typeof window.Waves !== 'undefined') {
      console.log('Using Keeper detected')
      return <IKeeper>(window.Waves)
    } else {
      throw new Error('No Keeper detected')
    }
  }
}
