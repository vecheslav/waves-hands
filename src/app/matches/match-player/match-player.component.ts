import { Component, Input, OnInit } from '@angular/core'
import { PlayerStatus } from '../shared/match.interface'

@Component({
  selector: 'app-match-player',
  templateUrl: './match-player.component.html',
  styleUrls: ['./match-player.component.scss']
})
export class MatchPlayerComponent implements OnInit {
  @Input() player: any = {
  }

  status: PlayerStatus = PlayerStatus.Waiting

  constructor() { }

  ngOnInit() {
  }

}
