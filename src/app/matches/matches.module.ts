import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatchesComponent } from './matches.component'
import { MatchCardComponent } from './match-card/match-card.component'
import { MatchComponent } from './match/match.component'
import { RouterModule } from '@angular/router'
import { AuthModule } from '../auth/auth.module'
import { SharedModule } from '../shared/shared.module'
import { UserModule } from '../user/user.module'
import { MatchesService } from './matches.service'
import { MatchesHelper } from './shared/matches.helper'
import { NotificationsModule } from '../notifications/notifications.module'
import { MatchPlayerPanelComponent } from './match/match-player-panel/match-player-panel.component'

@NgModule({
  declarations: [MatchesComponent, MatchCardComponent, MatchComponent, MatchPlayerPanelComponent],
  imports: [
    CommonModule,
    RouterModule,
    AuthModule,
    SharedModule,
    UserModule,
    NotificationsModule,
  ],
  providers: [
    MatchesService,
    MatchesHelper,
  ],
  exports: [
    MatchesComponent,
    MatchComponent,
  ]
})
export class MatchesModule { }
