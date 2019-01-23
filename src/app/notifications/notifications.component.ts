import { Component, OnDestroy, OnInit } from '@angular/core'
import { NotificationsService } from './notifications.service'
import { INotification } from './notifications.interface'

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit, OnDestroy {
  notifications: INotification[] = []
  isLoading = true

  private _notificationssSubscriber

  constructor(private notificationsService: NotificationsService) {
    this._notificationssSubscriber = this.notificationsService.notifications$.subscribe((notifications: INotification[]) => {
      this.notifications = notifications.sort((a, b) => (a.timestamp > b.timestamp) ? -1 : 1)

      this.isLoading = false
    })
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    this._notificationssSubscriber.unsubscribe()
  }
}
