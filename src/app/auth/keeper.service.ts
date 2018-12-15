import { Injectable } from '@angular/core';
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

  private _getKeeper(): Promise<IKeeper> {
    return new Promise<IKeeper>(((resolve, reject) => {
      if (typeof (<any>window).Waves !== 'undefined') {
        console.log('Using Keeper detected');

        resolve((<any>window).Waves)
      } else {
        reject(new Error('No Keeper detected'));
      }
    }))
  }
}
