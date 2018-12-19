import { Component, Input, OnInit } from '@angular/core'
import { HandSign, IMatch, MatchStage, Player } from '../shared/match.interface'
import { Router } from '@angular/router'
import { MatchesService } from '../matches.service'
import { KeeperService } from '../../auth/keeper.service'

@Component({
  selector: 'app-match',
  templateUrl: './match.component.html',
  styleUrls: ['./match.component.scss']
})
export class MatchComponent implements OnInit {
  @Input() match: IMatch

  stage: MatchStage = MatchStage.SelectHands
  selectedHandSigns: HandSign[] = []
  isJoinedToMatch = false
  currentPlayer: Player

  constructor(private router: Router, private keeperService: KeeperService) { }

  ngOnInit() {
    this.isJoinedToMatch = !!this.match.address
    this.currentPlayer = this.keeperService.getCurrentPlayer()
  }

  async select(handSign: HandSign) {
    if (this.stage !== MatchStage.SelectHands) {
      return
    }
    this.selectedHandSigns.push(handSign)

    if (this.selectedHandSigns.length === 3) {
      if (this.isJoinedToMatch) {
        await this.join()
      } else {
        await this.create()
      }
    }
  }

  async create() {
    try {
      // await this.matchesService.createMatch(this.selectedHandSigns)
      this.stage = MatchStage.CreatedMatch
    } catch (err) {
      console.error(err)
    }
  }

  async join() {
    try {
      this.stage = MatchStage.ResultMatch
    } catch (err) {
      console.error(err)
    }
  }

  close() {
    this.router.navigate(['../'])
  }
}
