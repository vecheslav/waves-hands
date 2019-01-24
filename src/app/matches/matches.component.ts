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

  private _matchesSubscribe

  constructor(private route: ActivatedRoute,
              private matchesService: MatchesService) {
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
    this.matchesService.startPollingMatches()
  }

  ngOnDestroy() {
    this._matchesSubscribe.unsubscribe()
    this.matchesService.stopPollingMatches()
  }
}


