import { Component, OnInit } from '@angular/core'
import { MatchesService } from './matches.service'
import { IMatch } from './shared/match.interface'
import { ActivatedRoute } from '@angular/router'

@Component({
  selector: 'app-matches',
  templateUrl: './matches.component.html',
  styleUrls: ['./matches.component.scss']
})
export class MatchesComponent implements OnInit {
  matches: IMatch[]

  isLoading = true

  constructor(private route: ActivatedRoute, private matchesService: MatchesService) {
  }

  async ngOnInit() {
    this.matches = await this.matchesService.getMatchList()
    this.isLoading = false
  }

}


