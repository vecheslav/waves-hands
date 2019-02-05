import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { PreviewComponent } from './preview/preview.component'
import { HTTP_INTERCEPTORS } from '@angular/common/http'
import { ApiInterceptor } from './api.interceptor'
import { RouterModule } from '@angular/router'
import { TranslateModule } from '@ngx-translate/core'
import { SharedModule } from '../shared/shared.module'

@NgModule({
  declarations: [
    PreviewComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    SharedModule,
  ],
  exports: [
    PreviewComponent,
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ApiInterceptor,
      multi: true,
    }
  ]
})
export class CoreModule {
  constructor() {

  }

}
