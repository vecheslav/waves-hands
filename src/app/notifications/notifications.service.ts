import { Injectable } from '@angular/core'
import { BehaviorSubject, Subject } from 'rxjs'
import { INotification, NotificationType } from './notifications.interface'
import { IUser } from '../user/user.interface'

@Injectable()
export class NotificationsService {
  // TODO: can be merged into one in the future
  notifications$ = new BehaviorSubject<INotification[]>(<INotification[]>[])
  newNotification$ = new BehaviorSubject<INotification>(null)
  removeNotification$ = new Subject<number>()

  private _user: IUser
  private _total = 0
  private _unread = 0

  constructor() {
  }

  getUnreadCount() {
    return this._unread
  }

  markAllRead() {
    this._unread = 0
  }

  add(notification: INotification) {
    this._total++

    if (!notification.timestamp) {
      notification.timestamp = Date.now()
    }

    const id = notification.id = this._total

    // Show notification
    this.newNotification$.next(notification)

    if (!this._user) {
      return id
    }

    if (!this._user.address) {
      return id
    }

    if (notification.stored || notification.type === NotificationType.Action) {
      // Save notification
      this._unread++
      this.notifications$.next(this.notifications$.getValue().concat([notification]))
      this._addNotificationToStorage(this._user.address, notification)
    }

    return id
  }

  remove(notificationId: number) {
    this.removeNotification$.next(notificationId)
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
