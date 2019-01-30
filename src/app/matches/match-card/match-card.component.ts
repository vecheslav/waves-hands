import { Component, HostListener, Input, OnInit } from '@angular/core'
import { IMatch, MatchStatus } from '../shared/match.interface'
import { environment } from 'src/environments/environment'
import { MatchesService } from '../matches.service'

const REVEAL_HEIGHT = environment.creatorRevealBlocksCount + 1

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
  pendingLeftPercent = 100

  private _pendingLeftHeight = 0

  constructor(private matchesService: MatchesService) { }

  ngOnInit() {
    this.shareUrl = window.location.origin + '/match/' + this.match.address

    this._initLeftPercent()
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    if (this.match.status === MatchStatus.New && !this.match.owns && !this.match.opponent) {
      this.startIsShown = true
    }
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.startIsShown = false
  }

  private _initLeftPercent() {
    if (this.match.status === MatchStatus.Waiting && this.match.reservationHeight) {
      const heightPassed = this.matchesService.currentHeight - this.match.reservationHeight
      this._pendingLeftHeight = Math.max(REVEAL_HEIGHT - heightPassed, 0)
      this.pendingLeftPercent = this._pendingLeftHeight * 100 / REVEAL_HEIGHT
    }
  }
}
