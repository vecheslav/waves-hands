import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CircleLoaderComponent } from './circle-loader/circle-loader.component';
import { MatchPlayerComponent } from './match-player/match-player.component';
import { ShareMatchComponent } from './share-match/share-match.component'

@NgModule({
  declarations: [CircleLoaderComponent, MatchPlayerComponent, ShareMatchComponent],
  imports: [
    CommonModule
  ],
  exports: [
    CircleLoaderComponent,
    MatchPlayerComponent,
    ShareMatchComponent,
  ]
})
export class SharedModule { }
