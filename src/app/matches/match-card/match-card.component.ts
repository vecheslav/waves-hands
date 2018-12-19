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
    status: MatchStatus.Waiting
  } as IMatch

  startIsShown = false

  constructor() { }

  ngOnInit() {
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    if (this.match.status === MatchStatus.Waiting) {
      this.startIsShown = true
    }
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.startIsShown = false
  }

  share() {
    console.log(this.match.address)
  }
}
