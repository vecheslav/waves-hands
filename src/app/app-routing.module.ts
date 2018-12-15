import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'
import { GameComponent } from './game/game.component'
import { GameModule } from './game/game.module'

const routes: Routes = [
  {
    path: '',
    component: GameComponent,
  }
]

@NgModule({
  imports: [
    RouterModule.forRoot(routes)
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
