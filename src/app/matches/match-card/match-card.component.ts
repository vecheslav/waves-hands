import { Component, HostListener, Input, OnChanges } from '@angular/core'
import { IMatch, MatchStatus } from '../shared/match.interface'
import { environment } from 'src/environments/environment'
import { MatchesService } from '../matches.service'
import { SubscriptionLike } from 'rxjs'

const REVEAL_HEIGHT = environment.creatorRevealBlocksCount + 1

@Component({
  selector: 'app-match-card',
  templateUrl: './match-card.component.html',
  styleUrls: ['./match-card.component.scss'],
})
export class MatchCardComponent implements OnChanges {
  @Input() match: IMatch = {
    address: 'address',
    status: MatchStatus.WaitingForP2,
  } as IMatch

  matchStatus = MatchStatus

  startIsShown = false
  shareUrl: string
  pendingLeftPercent = 0

  private _pendingLeftHeight = 0
  private _heightSubscriber: SubscriptionLike

  constructor(private matchesService: MatchesService) {
    this._heightSubscriber = this.matchesService.height$.subscribe(height => {
      if (height) {
        this._initLeftPercent()
      }
    })

  }

  ngOnChanges() {
    this.shareUrl = window.location.origin + '/match/' + this.match.address

    this._initLeftPercent()
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    if (this.match.status === MatchStatus.WaitingForP2 && !this.match.owns && !this.match.opponent) {
      this.startIsShown = true
    }
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.startIsShown = false
  }

  async revoke() {
    await this.matchesService.revokeBet(this.match.address)
  }

  async payout() {
    await this.matchesService.payout(this.match.address)
  }

  private _initLeftPercent() {
    this.pendingLeftPercent = 0

    if (
      (
        this.match.status === MatchStatus.WaitingBothToReveal ||
        this.match.status === MatchStatus.WaitingP1ToReveal ||
        this.match.status === MatchStatus.WaitingP2ToReveal
      ) &&
      this.match.reservationHeight
    ) {
      const heightPassed = this.matchesService.height$.getValue() - this.match.reservationHeight
      this._pendingLeftHeight = Math.max(REVEAL_HEIGHT - heightPassed, 0)
      this.pendingLeftPercent = this._pendingLeftHeight * 100 / REVEAL_HEIGHT
    }
  }
}
