import { Component, OnDestroy, OnInit } from '@angular/core'
import { INotification, NotificationType, ActionType } from '../notifications.interface'
import { NotificationsService } from '../notifications.service'
import { delay, first, tap } from 'rxjs/operators'
import { of } from 'rxjs'

type Notification = INotification & { toFaded: boolean }

@Component({
  selector: 'app-notification-flow',
  templateUrl: './notification-flow.component.html',
  styleUrls: ['./notification-flow.component.scss']
})
export class NotificationFlowComponent implements OnInit, OnDestroy {
  notifications: Notification[] = []

  private _notificationssSubscriber

  constructor(private notificationsService: NotificationsService) {
    this._notificationssSubscriber = this.notificationsService.newNotification$.subscribe((notification: Notification) => {
      if (notification) {
        notification.toFaded = false
        of(this.notifications.push(notification))
          .pipe(
            delay(3000),
            tap(() => {
              notification.toFaded = true
            }),
          )
          .pipe(
            delay(1000),
            tap(() => {
              this.notifications.shift()
            }),
          )
          .pipe(first())
          .subscribe()
      }
    })
  }

  ngOnInit() {
    // this.notifications.push({ type: NotificationType.Action, params: [ActionType.YouJoined], toFaded: false, timestamp: 123123213 })
    // this.notifications.push({ type: NotificationType.Action, params: [ActionType.OpponentJoined], toFaded: false, timestamp: 123123213 })
  }

  ngOnDestroy() {
    this._notificationssSubscriber.unsubscribe()
  }
}
