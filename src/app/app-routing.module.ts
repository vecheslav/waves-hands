import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'
import { MatchComponent } from './matches/match/match.component'
import { MatchesComponent } from './matches/matches.component'
import { MatchGuard } from './matches/match/match.guard'

const routes: Routes = [
  {
    path: '',
    component: MatchesComponent,
    children: [
      {
        path: 'match',
        component: MatchComponent,
        canActivate: [MatchGuard],
      },
      {
        path: 'match/:address',
        component: MatchComponent,
        canActivate: [MatchGuard],
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
