import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { PreviewComponent } from './preview/preview.component'

@NgModule({
  declarations: [
    PreviewComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    PreviewComponent
  ]
})
export class CoreModule {
  constructor() {

  }

}
