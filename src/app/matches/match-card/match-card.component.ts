import { Component, Input, OnInit } from '@angular/core'
import { MatchStatus } from '../shared/match.interface'

@Component({
  selector: 'app-match-card',
  templateUrl: './match-card.component.html',
  styleUrls: ['./match-card.component.scss']
})
export class MatchCardComponent implements OnInit {
  @Input() match = {
    id: 32,
    status: MatchStatus.Waiting
  }

  constructor() { }

  ngOnInit() {
  }

}
