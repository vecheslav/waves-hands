import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserPanelComponent } from './user-panel/user-panel.component';

@NgModule({
  declarations: [UserPanelComponent],
  imports: [
    CommonModule
  ],
  exports: [
    UserPanelComponent
  ]
})
export class UserModule { }
