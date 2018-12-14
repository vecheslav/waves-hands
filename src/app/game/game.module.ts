import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameComponent } from './game.component';
import { CoreModule } from '../core/core.module';
import { MatchesModule } from '../matches/matches.module';

@NgModule({
  declarations: [
    GameComponent
  ],
  imports: [
    CommonModule,
    CoreModule,
    MatchesModule
  ],
  exports: [
    GameComponent
  ]
})
export class GameModule { }
