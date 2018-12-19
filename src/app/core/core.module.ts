import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { PreviewComponent } from './preview/preview.component'
import { HTTP_INTERCEPTORS } from '@angular/common/http'
import { ApiInterceptor } from './api.interceptor'

@NgModule({
  declarations: [
    PreviewComponent
  ],
  imports: [
    CommonModule,
  ],
  exports: [
    PreviewComponent
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ApiInterceptor,
      multi: true
    }
  ]
})
export class CoreModule {
  constructor() {

  }

}
