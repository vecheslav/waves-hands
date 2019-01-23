import { Component, Input, OnInit } from '@angular/core'
import { ActionType, INotification, NotificationType } from '../notifications.interface'
import { messageText } from '../notifictions'
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'

@Component({
  selector: 'app-notification-item',
  templateUrl: './notification-item.component.html',
  styleUrls: ['./notification-item.component.scss']
})
export class NotificationItemComponent implements OnInit {
  @Input() notification: INotification
  message: string
  messageSafeHtml: SafeHtml

  actionType = ActionType

  constructor(private sanitizer: DomSanitizer) { }

  ngOnInit() {
    this._makeMessage()
    this._makeMessageBody()
  }

  private _makeMessage() {
    this.message = this.notification.message

    if (this.notification.type === NotificationType.Action && this.notification.params) {
      this.message = (NotificationType.Action + '_' + this.notification.params[0]).toUpperCase()
    }
  }

  private _makeMessageBody() {
    const params = this.notification.params
    let messageBody = messageText[this.message]

    if (!messageBody) {
      return
    }

    // Adding params
    for (let i = 0; i < params.length; i++) {
      messageBody = messageBody.replace('{' + i + '}', params[i])
    }

    // Adding links
    messageBody = messageBody.replace(/#([a-zA-Z0-9]{35})/g, (match, s) => {
      return `<a href="/match/${s}" target="_blank">#${s.slice(-5)}</a>`
    })
    this.messageSafeHtml = this.sanitizer.bypassSecurityTrustHtml(messageBody)
  }
}
