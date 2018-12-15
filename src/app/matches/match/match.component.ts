import { Component, Input, OnInit } from '@angular/core'
import { MatchStatus } from '../shared/match.interface'

@Component({
  selector: 'app-match',
  templateUrl: './match.component.html',
  styleUrls: ['./match.component.scss']
})
export class MatchComponent implements OnInit {
  @Input() match = {
    id: 32,
    status: MatchStatus.Waiting
  }

  constructor() { }

  ngOnInit() {
  }

}
