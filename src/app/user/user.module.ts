import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserPanelComponent } from './user-panel/user-panel.component';
import { AuthModule } from '../auth/auth.module'
import { UserService } from './user.service'
import { SharedModule } from '../shared/shared.module'
import { AuthGuard } from './auth.guard'

@NgModule({
  declarations: [UserPanelComponent],
  imports: [
    CommonModule,
    AuthModule,
    SharedModule
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
