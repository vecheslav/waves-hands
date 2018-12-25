import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CircleLoaderComponent } from './circle-loader/circle-loader.component';
import { MatchPlayerComponent } from './match-player/match-player.component'

@NgModule({
  declarations: [CircleLoaderComponent, MatchPlayerComponent],
  imports: [
    CommonModule
  ],
  exports: [
    CircleLoaderComponent,
    MatchPlayerComponent
  ]
})
export class SharedModule { }
