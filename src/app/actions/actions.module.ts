import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ActionsComponent } from './actions.component'
import { ActionsService } from './actions.service'
import { SharedModule } from '../shared/shared.module'

@NgModule({
  declarations: [ActionsComponent],
  providers: [
    ActionsService,
  ],
  imports: [
    CommonModule,
    SharedModule,
  ]
})
export class ActionsModule { }
