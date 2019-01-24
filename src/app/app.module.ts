import { BrowserModule } from '@angular/platform-browser'
import { NgModule, Injectable, ErrorHandler } from '@angular/core'

import { AppRoutingModule } from './app-routing.module'
import { AppComponent } from './app.component'
import { GameModule } from './game/game.module'
import { HttpClientModule } from '@angular/common/http'
import { AuthModule } from './auth/auth.module'
import { CoreModule } from './core/core.module'
import { MatchesModule } from './matches/matches.module'
import { UserModule } from './user/user.module'

import * as Sentry from '@sentry/browser'
import { environment } from 'src/environments/environment'
import { NotificationsModule } from './notifications/notifications.module'

if (environment.production) {
  Sentry.init({
    dsn: 'https://d6f8eab0064d4728b57bc20654e111ff@sentry.io/1376566',
  })
}

@Injectable()
export class SentryErrorHandler implements ErrorHandler {
  constructor() {
  }

  handleError(err) {
    Sentry.captureException(err.originalError || err)
    throw err
  }
}

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    AuthModule.forRoot(),
    GameModule,
    CoreModule,
    MatchesModule,
    UserModule,
    NotificationsModule,
  ],
  providers: [
    {
      provide: ErrorHandler,
      useClass: environment.production ? SentryErrorHandler : ErrorHandler
    }
  ],
  bootstrap: [AppComponent]
})

export class AppModule { }
