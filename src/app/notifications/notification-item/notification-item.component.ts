import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core'
import { ActionType, INotification, NotificationType } from '../notifications.interface'
import { messageText, messageIcon } from '../notifictions'
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'

@Component({
  selector: 'app-notification-item',
  templateUrl: './notification-item.component.html',
  styleUrls: ['./notification-item.component.scss'],
})
export class NotificationItemComponent implements OnInit {
  @Input() notification: INotification
  message: string
  messageSafeHtml: SafeHtml
  messageClass: string
  iconKey: string

  notificationType = NotificationType
  actionType = ActionType

  constructor(private sanitizer: DomSanitizer) { }

  ngOnInit() {
    this._initMessage()
  }

  private _initMessage() {
    this.messageClass = this.notification.type
    this.message = this.notification.message
    this.iconKey = messageIcon[this.notification.type.toUpperCase()]

    // Prepare message from types
    if (this.notification.type === NotificationType.Action && this.notification.params) {
      this.messageClass = NotificationType.Action + '_' + this.notification.params[0]
      this.message = this.messageClass.toUpperCase()
      this.iconKey = messageIcon[this.message]
    }

    

    this._initMessageBody()
  }

  private _initMessageBody() {
    const params = this.notification.params
    let messageBody = messageText[this.message]

    if (!messageBody) {
      return
    }

    if (params) {
      // Adding params
      for (let i = 0; i < params.length; i++) {
        messageBody = messageBody.replace('{' + i + '}', params[i])
      }
    }

    // Adding links
    messageBody = messageBody.replace(/#([a-zA-Z0-9]{35})/g, (match, s) => {
      return `<a href="/match/${s}" target="_blank">#${s.slice(-5)}</a>`
    })
    this.messageSafeHtml = this.sanitizer.bypassSecurityTrustHtml(messageBody)
  }
}
