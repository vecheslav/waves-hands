import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { GameComponent } from './game.component'
import { CoreModule } from '../core/core.module'
import { MatchesModule } from '../matches/matches.module'
import { UserModule } from '../user/user.module'
import { MatchResolver } from './match.resolver'

@NgModule({
  imports: [
    CommonModule,
    CoreModule,
    MatchesModule,
    UserModule,
  ],
  declarations: [
    GameComponent,
  ],
  providers: [
    MatchResolver
  ],
  exports: [
    GameComponent
  ]
})
export class GameModule { }
