import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { NotificationsComponent } from './notifications.component'
import { NotificationsService } from './notifications.service'
import { SharedModule } from '../shared/shared.module'
import { NotificationItemComponent } from './notification-item/notification-item.component'
import { RouterModule } from '@angular/router';
import { NotificationFlowComponent } from './notification-flow/notification-flow.component'
import { TranslateModule } from '@ngx-translate/core'

@NgModule({
  declarations: [
    NotificationsComponent,
    NotificationItemComponent,
    NotificationFlowComponent
  ],
  providers: [
    NotificationsService,
  ],
  imports: [
    CommonModule,
    RouterModule,
    SharedModule,
    TranslateModule,
  ],
  exports: [
    NotificationsComponent,
    NotificationFlowComponent,
  ]
})
export class NotificationsModule { }
