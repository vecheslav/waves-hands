import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { GameComponent } from './game.component'
import { CoreModule } from '../core/core.module'
import { MatchesModule } from '../matches/matches.module'
import { UserModule } from '../user/user.module'

@NgModule({
  declarations: [
    GameComponent,
  ],
  imports: [
    CommonModule,
    CoreModule,
    MatchesModule,
    UserModule,
  ],
  exports: [
    GameComponent
  ]
})
export class GameModule { }
