import { BrowserModule } from '@angular/platform-browser'
import { NgModule } from '@angular/core'

import { AppRoutingModule } from './app-routing.module'
import { AppComponent } from './app.component'
import { GameModule } from './game/game.module'
import { HttpClientModule } from '@angular/common/http'
import { AuthModule } from './auth/auth.module'
import { CoreModule } from './core/core.module'
import { MatchesModule } from './matches/matches.module'
import { UserModule } from './user/user.module'
import { ActionsModule } from './actions/actions.module';

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
    ActionsModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
