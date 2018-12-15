import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatchesComponent } from './matches.component'
import { MatchComponent } from './match/match.component';
import { MatchPlayerComponent } from './match-player/match-player.component'

@NgModule({
  declarations: [MatchesComponent, MatchComponent, MatchPlayerComponent],
  imports: [
    CommonModule
  ],
  exports: [
    MatchesComponent
  ]
})
export class MatchesModule { }
