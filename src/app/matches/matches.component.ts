import { Component, OnDestroy, OnInit } from '@angular/core'
import { MatchesService } from './matches.service'
import { Match } from './shared/match.interface'
import { ActivatedRoute } from '@angular/router'
import { SubscriptionLike } from 'rxjs'

@Component({
  selector: 'app-matches',
  templateUrl: './matches.component.html',
  styleUrls: ['./matches.component.scss'],
})
export class MatchesComponent implements OnInit, OnDestroy {
  matches: Match[] = []

  isLoading = true
  isDisabled = false

  private readonly _matchesSubscriber: SubscriptionLike

  constructor(private route: ActivatedRoute,
              private matchesService: MatchesService) {
    if (this.isDisabled) {
      this.isLoading = false
      return
    }

    this._matchesSubscriber = this.matchesService.updates$.subscribe((updates: Record<string, Match>) => {
      if (!updates) {
        return
      }

      for (const update of Object.values(updates)) {
        let match = this.matches.find(m => m.address === update.address)

        if (match) {
          match = Object.assign(match, update)
        } else {
          this.matches.push(update)
        }
      }

      this.matches.sort((a: Match, b: Match) => {
        return (a.timestamp > b.timestamp) ? -1 : 1
      })
      this.isLoading = false
    })
  }

  ngOnInit() {
    if (!this.isDisabled) {
      this.matchesService.startPolling()
    }
  }

  ngOnDestroy() {
    if (this._matchesSubscriber) {
      this._matchesSubscriber.unsubscribe()
    }
    this.matchesService.stopPolling()
  }
}


