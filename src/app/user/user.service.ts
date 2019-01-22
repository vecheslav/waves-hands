import { Injectable } from '@angular/core'
import { KeeperService } from '../auth/keeper.service'
import { BehaviorSubject } from 'rxjs'
import { IUser } from './user.interface'
import { ActionsService } from '../actions/actions.service'

@Injectable()
export class UserService {
  user$ = new BehaviorSubject<IUser>(null)

  constructor(private keeperService: KeeperService, private actionsService: ActionsService) {
  }

  getCurrentUser() {
    let user = this.user$.getValue()

    // Get from storage
    if (!user) {
      user = this._getUserFromStorage()

      if (user) {
        this.user$.next(user)
      }
    }

    if (user) {
      this.actionsService.selectUser(user)
    }

    return user
  }

  async authUser(): Promise<IUser> {
    try {
      const { address, publicKey, signature } = await this.keeperService.auth({
        data: 'waves-hands'
      })

      const user = { address, publicKey, signature }
      this._setUserInStorage(user)
      this.user$.next(user)
      this.actionsService.selectUser(user)

      return user
    } catch (err) {
      console.error(err)
      return
    }
  }

  async logout() {
    this.user$.next(null)
    this._setUserInStorage(null)
  }

  private _getUserFromStorage() {
    return JSON.parse(localStorage.getItem('user'))
  }

  private _setUserInStorage(user) {
    localStorage.setItem('user', JSON.stringify(user))
  }
}
