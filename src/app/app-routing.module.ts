import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'
import { GameComponent } from './game/game.component'
import { MatchResolver } from './game/match.resolver'
import { MatchComponent } from './matches/match/match.component'

const routes: Routes = [
  {
    path: '',
    component: GameComponent,
  },
  {
    path: 'match',
    component: GameComponent,
    resolve: {
      match: MatchResolver
    },
  },
  {
    path: 'match/:id',
    component: GameComponent,
    resolve: {
      match: MatchResolver
    },
  },
]

@NgModule({
  imports: [
    RouterModule.forRoot(routes)
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
