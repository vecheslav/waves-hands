import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'
import { MatchResolver } from './game/match.resolver'
import { AuthGuard } from './user/auth.guard'
import { MatchComponent } from './matches/match/match.component'
import { GameComponent } from './game/game.component'

const routes: Routes = [
  {
    path: '',
    component: GameComponent,
    children: [
      {
        path: 'match',
        component: MatchComponent,
        resolve: {
          match: MatchResolver
        },
        canActivate: [AuthGuard]
      },
      {
        path: 'match/:address',
        component: MatchComponent,
        resolve: {
          match: MatchResolver
        },
        canActivate: [AuthGuard]
      },
    ]
  },
]

@NgModule({
  imports: [
    RouterModule.forRoot(routes)
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
