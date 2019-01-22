import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ActionsComponent } from './actions.component'
import { ActionsService } from './actions.service'
import { SharedModule } from '../shared/shared.module'
import { ActionItemComponent } from './action-item/action-item.component'
import { RouterModule } from '@angular/router'

@NgModule({
  declarations: [ActionsComponent, ActionItemComponent],
  providers: [
    ActionsService,
  ],
  imports: [
    CommonModule,
    RouterModule,
    SharedModule,
  ],
  exports: [
    ActionsComponent,
  ]
})
export class ActionsModule { }
