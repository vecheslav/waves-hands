import { Component, OnDestroy, OnInit } from '@angular/core'
import { MatchesService } from './matches.service'
import { IMatch } from './shared/match.interface'
import { ActivatedRoute } from '@angular/router'

@Component({
  selector: 'app-matches',
  templateUrl: './matches.component.html',
  styleUrls: ['./matches.component.scss']
})
export class MatchesComponent implements OnInit, OnDestroy {
  matches: IMatch[]

  isLoading = true
  isDisabled = true

  private _matchesSubscribe

  constructor(private route: ActivatedRoute,
              private matchesService: MatchesService) {
    if (this.isDisabled) {
      this.isLoading = false
      return
    }

    this._matchesSubscribe = this.matchesService.matches$.subscribe((matches: Record<string, IMatch>) => {
      if (!matches) {
        return
      }
      // Assign to array
      this.matches = Object.values(matches)
      this.isLoading = false
    })
  }

  ngOnInit() {
    if (this.isDisabled) {
      this.matchesService.startPollingMatches()
    }
  }

  ngOnDestroy() {
    if (this._matchesSubscribe) {
      this._matchesSubscribe.unsubscribe()
    }
    this.matchesService.stopPollingMatches()
  }
}


