import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatchesComponent } from './matches.component'
import { MatchCardComponent } from './match-card/match-card.component'
import { MatchPlayerComponent } from './match-player/match-player.component'
import { MatchComponent } from './match/match.component'
import { RouterModule } from '@angular/router'
import { AuthModule } from '../auth/auth.module'

@NgModule({
  declarations: [MatchesComponent, MatchCardComponent, MatchPlayerComponent, MatchComponent],
  imports: [
    CommonModule,
    RouterModule,
    AuthModule
  ],
  exports: [
    MatchesComponent,
    MatchComponent
  ]
})
export class MatchesModule { }
