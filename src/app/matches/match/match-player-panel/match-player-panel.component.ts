import { Component, OnInit, Input, ViewEncapsulation } from '@angular/core'
import { IPlayer, HandSign } from '../../shared/match.interface'

@Component({
  selector: 'app-match-player-panel',
  templateUrl: './match-player-panel.component.html',
  styleUrls: ['./match-player-panel.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class MatchPlayerPanelComponent implements OnInit {
  @Input() player: IPlayer
  @Input() hands: HandSign[]

  constructor() { }

  ngOnInit() {
  }

}
