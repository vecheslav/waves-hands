import { Component, Input, OnInit } from '@angular/core'

@Component({
  selector: 'app-match-player',
  templateUrl: './match-player.component.html',
  styleUrls: ['./match-player.component.scss']
})
export class MatchPlayerComponent implements OnInit {
  @Input() player: any = {
  }

  constructor() { }

  ngOnInit() {
  }

}
