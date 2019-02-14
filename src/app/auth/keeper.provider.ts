import { Injectable } from '@angular/core'
import { IKeeper, KeeperStatus } from './shared/keeper.interface'

declare var window: any

@Injectable()
export class KeeperProvider {
  status: KeeperStatus = {
    isExist: false,
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
    if ((typeof window.WavesKeeper || typeof window.Waves) !== 'undefined') {
      this.status.isExist = true
      return <IKeeper>(window.WavesKeeper || window.Waves)
    } else {
      this.status.isExist = false
      console.warn('No Keeper detected')
    }
  }
}
