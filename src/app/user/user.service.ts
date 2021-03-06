import { Injectable } from '@angular/core'
import { KeeperService } from '../auth/keeper.service'
import { BehaviorSubject } from 'rxjs'
import { IUser } from './user.interface'
import { NotificationsService } from '../notifications/notifications.service'

@Injectable()
export class UserService {
  user$ = new BehaviorSubject<IUser>(null)

  constructor(private keeperService: KeeperService, private notificationsService: NotificationsService) {
    this._subscribeOnKeeper()
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
      this.notificationsService.selectUser(user)
    }

    return user
  }

  async authUser(): Promise<IUser> {
    try {
      const { address, publicKey, signature } = await this.keeperService.auth({
        data: 'waves-hands'
      })

      const user = { address, publicKey, signature }
      this.setUser(user)

      return user
    } catch (err) {
      console.error(err)
      return
    }
  }

  async setUser(user: IUser) {
    this._setUserInStorage(user)
    this.user$.next(user)
    this.notificationsService.selectUser(user)
  }

  async logout() {
    this.user$.next(null)
    this._setUserInStorage(null)
  }

  private _subscribeOnKeeper() {
    this.keeperService.on('update', state => {
      if (state && state.account) {
        const { address, publicKey } = state.account
        const currentUser = this.user$.getValue()

        if (!currentUser || currentUser.address !== address) {
          this.setUser({ address, publicKey })
        }
      }
    })
  }

  private _getUserFromStorage() {
    return JSON.parse(localStorage.getItem('user'))
  }

  private _setUserInStorage(user) {
    localStorage.setItem('user', JSON.stringify(user))
  }
}
