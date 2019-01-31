import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { CircleLoaderComponent } from './circle-loader/circle-loader.component'
import { MatchPlayerComponent } from './match-player/match-player.component'
import { ShareMatchComponent } from './share-match/share-match.component'
import { ClickOutsideDirective } from './click-outside/click-outside.directive'
import { TourComponent } from './tour/tour.component'
import { TourService } from './tour/tour.service'

@NgModule({
  declarations: [
    CircleLoaderComponent,
    MatchPlayerComponent,
    ShareMatchComponent,
    ClickOutsideDirective,
    TourComponent
  ],
  imports: [
    CommonModule,
  ],
  providers: [
    TourService,
  ],
  exports: [
    CircleLoaderComponent,
    MatchPlayerComponent,
    ShareMatchComponent,
    ClickOutsideDirective,
    TourComponent,
  ]
})
export class SharedModule { }
