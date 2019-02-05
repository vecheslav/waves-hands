import { Component, OnDestroy, OnInit } from '@angular/core'
import { INotification, NotificationType } from '../notifications.interface'
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
  notifications: Record<number, Notification> = {}
  objectValues = Object.values

  private _notificationsSubscriber
  private _removeSubscriber

  constructor(private notificationsService: NotificationsService) {
    this._notificationsSubscriber = this.notificationsService.newNotification$.subscribe((notification: Notification) => {
      if (notification) {
        notification.toFaded = false

        this.notifications[notification.id] = notification

        if (notification.type !== NotificationType.Process) {
          of(true)
            .pipe(
              delay(3000),
              tap(() => {
                notification.toFaded = true
              }),
            )
            .pipe(
              delay(500),
              tap(() => {

                delete this.notifications[notification.id]
              }),
            )
            .pipe(first())
            .subscribe()
        }
      }
    })

    this._removeSubscriber = this.notificationsService.removeNotification$.subscribe(id => {
      this.remove(id)
    })
  }

  remove(notificationId: number) {
    const notification = this.notifications[notificationId]
    of(notification.toFaded = true)
      .pipe(
        delay(500),
        tap(() => {
          delete this.notifications[notificationId]
        }),
      )
      .pipe(first())
      .subscribe()
  }

  ngOnInit() {
    // this.notificationsService.add({ type: NotificationType.Process, message: 'PROCESS_FINISH_MATCH', timestamp: 123123213 })
    // this.notificationsService.add({ type: NotificationType.Error, message: 'ERROR_USER_REJECTED', timestamp: 123123214 })

    // setTimeout(() => {
    //   this.notificationsService.remove(1)
    // }, 5000)
  }

  ngOnDestroy() {
    this._notificationsSubscriber.unsubscribe()
    this._removeSubscriber.unsubscribe()
  }
}
