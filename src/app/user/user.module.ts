import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { UserPanelComponent } from './user-panel/user-panel.component'
import { AuthModule } from '../auth/auth.module'
import { UserService } from './user.service'
import { SharedModule } from '../shared/shared.module'
import { AuthGuard } from './auth.guard'
import { RouterModule } from '@angular/router'
import { NotificationsModule } from '../notifications/notifications.module'
import { TranslateModule } from '@ngx-translate/core'

@NgModule({
  declarations: [UserPanelComponent],
  imports: [
    CommonModule,
    AuthModule,
    SharedModule,
    RouterModule,
    NotificationsModule,
    TranslateModule,
  ],
  providers: [
    UserService,
    AuthGuard
  ],
  exports: [
    UserPanelComponent
  ]
})
export class UserModule { }
