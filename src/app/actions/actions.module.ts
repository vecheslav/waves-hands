import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActionsComponent } from './actions.component';
import { ActionsService } from './actions.service'

@NgModule({
  declarations: [ActionsComponent],
  providers: [
    ActionsService
  ],
  imports: [
    CommonModule
  ]
})
export class ActionsModule { }
