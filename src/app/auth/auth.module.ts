import { APP_INITIALIZER, NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { KeeperProvider } from './keeper.provider'
import { KeeperService } from './keeper.service'

export function keeperFactory(provider: KeeperProvider) {
  return () => provider.init()
}

@NgModule({
  declarations: [],
  imports: [
    CommonModule
  ],
  providers: [
    KeeperService
  ]
})
export class AuthModule {
  static forRoot() {
    return {
      ngModule: AuthModule,
      providers: [
        KeeperProvider,
        {
          provide: APP_INITIALIZER,
          useFactory: keeperFactory,
          deps: [KeeperProvider],
          multi: true
        },
        KeeperService
      ]
    }
  }
}
