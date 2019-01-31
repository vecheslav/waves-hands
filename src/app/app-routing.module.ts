import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'
import { MatchComponent } from './matches/match/match.component'
import { MatchesComponent } from './matches/matches.component'

const routes: Routes = [
  {
    path: '',
    component: MatchesComponent,
    children: [
      {
        path: 'match',
        component: MatchComponent,
      },
      {
        path: 'match/:address',
        component: MatchComponent,
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
