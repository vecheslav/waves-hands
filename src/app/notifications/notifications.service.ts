import { Injectable } from '@angular/core'
import { BehaviorSubject } from 'rxjs'
import { INotification, NotificationType } from './notifications.interface'
import { IUser } from '../user/user.interface'

@Injectable()
export class NotificationsService {
  // TODO: can be merged into one in the future
  notifications$ = new BehaviorSubject<INotification[]>(<INotification[]>[])
  newNotification$ = new BehaviorSubject<INotification>(null)

  private _user: IUser

  constructor() {
  }

  add(notification: INotification) {
    if (!notification.timestamp) {
      notification.timestamp = Date.now()
    }

    // Show notification
    this.newNotification$.next(notification)

    if (!this._user) {
      return
    }

    if (!this._user.address) {
      return
    }

    if (notification.stored || notification.type === NotificationType.Action) {
      // Save notification
      this.notifications$.next(this.notifications$.getValue().concat([notification]))
      this._addNotificationToStorage(this._user.address, notification)
    }
  }

  selectUser(user: IUser) {
    this._user = user

    if (user && user.address) {
      this.notifications$.next(this._getNotificationsFromStorage(user.address))
    }
  }

  private _getNotificationsFromStorage(userAddress: string): INotification[] {
    const allActions = JSON.parse(localStorage.getItem('notifications')) || {}

    return allActions[userAddress] || []
  }

  private _addNotificationToStorage(userAddress: string, action: INotification): INotification {
    const allNotifications = JSON.parse(localStorage.getItem('notifications')) || {}
    allNotifications[userAddress] = allNotifications[userAddress] || []
    allNotifications[userAddress].push(action)

    localStorage.setItem('notifications', JSON.stringify(allNotifications))

    return action
  }
}
