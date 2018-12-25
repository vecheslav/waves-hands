import { Component, HostListener, Input, OnInit } from '@angular/core'
import { IMatch, MatchStatus } from '../shared/match.interface'

@Component({
  selector: 'app-match-card',
  templateUrl: './match-card.component.html',
  styleUrls: ['./match-card.component.scss']
})
export class MatchCardComponent implements OnInit {
  @Input() match: IMatch = {
    address: 'address',
    status: MatchStatus.New
  } as IMatch

  startIsShown = false
  shareUrl: string

  constructor() { }

  ngOnInit() {
    this.shareUrl = window.location.href + 'match/' + this.match.address
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    if (this.match.status === MatchStatus.New) {
      this.startIsShown = true
    }
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.startIsShown = false
  }
}
