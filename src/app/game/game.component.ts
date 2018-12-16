import { Component, OnInit } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { Match } from '../matches/shared/match.interface'

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss']
})
export class GameComponent implements OnInit {
  currentMatch: Match

  constructor(private route: ActivatedRoute) {
    this.currentMatch = this.route.snapshot.data.match
  }

  ngOnInit() {
  }

}
