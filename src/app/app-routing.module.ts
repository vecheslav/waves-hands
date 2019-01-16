import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'
import { MatchResolver } from './game/match.resolver'
import { AuthGuard } from './user/auth.guard'
import { MatchComponent } from './matches/match/match.component'
import { MatchesComponent } from './matches/matches.component'
import { ActionsComponent } from './actions/actions.component'

const routes: Routes = [
  {
    path: '',
    component: MatchesComponent,
    children: [
      {
        path: 'match',
        component: MatchComponent,
        resolve: {
          match: MatchResolver
        },
        canActivate: [AuthGuard],
      },
      {
        path: 'match/:address',
        component: MatchComponent,
        resolve: {
          match: MatchResolver
        },
        canActivate: [AuthGuard],
      },
    ]
  },
  {
    path: 'actions',
    component: ActionsComponent,
    canActivate: [AuthGuard],
  },
]

@NgModule({
  imports: [
    RouterModule.forRoot(routes)
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
