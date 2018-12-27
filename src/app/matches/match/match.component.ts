import { Component, Input, OnDestroy, OnInit } from '@angular/core'
import { HandSign, IMatch, MatchStage, Player } from '../shared/match.interface'
import { ActivatedRoute, Router } from '@angular/router'
import { MatchesService } from '../matches.service'
import { KeeperService } from '../../auth/keeper.service'
import { IUser } from '../../user/user.interface'
import { UserService } from '../../user/user.service'

@Component({
  selector: 'app-match',
  templateUrl: './match.component.html',
  styleUrls: ['./match.component.scss']
})
export class MatchComponent implements OnInit, OnDestroy {
  match: IMatch

  stage: MatchStage = MatchStage.SelectHands
  selectedHandSigns: HandSign[] = []
  isJoinedToMatch = false
  user: IUser

  keeperIsAvailable = true
  isLoading = false
  progress = null
  shareUrl: string

  private _userSubscriber

  constructor(private router: Router,
              private route: ActivatedRoute,
              private keeperService: KeeperService,
              private matchesService: MatchesService,
              private userServices: UserService) {
    this.match = this.route.snapshot.data.match

    this._userSubscriber = this.userServices.user$.subscribe((user: IUser) => {
      this.user = user
    })
  }

  ngOnInit() {
    this.isJoinedToMatch = !!this.match.address

    this._reset()
  }

  ngOnDestroy() {
    this._userSubscriber.unsubscribe()
  }

  async select(handSign: HandSign) {
    if (this.stage !== MatchStage.SelectHands) {
      return
    }
    this.selectedHandSigns.push(handSign)

    if (this.selectedHandSigns.length === 3) {
      this.isLoading = true

      if (this.isJoinedToMatch) {
        await this.join()
      } else {
        await this.create()
      }
    }
  }

  async create() {
    try {
      const match = await this.matchesService.createMatch(this.selectedHandSigns, this._changeProgress.bind(this))
      this.match = match
      this.shareUrl = window.location.origin + '/match/' + this.match.address
      this.stage = MatchStage.CreatedMatch
      this.isLoading = false
    } catch (err) {
      console.error(err)
      this._reset()
    }
  }

  async join() {
    try {
      await this.matchesService.joinMatch(
        this.match.address,
        this.match.publicKey,
        this.user.publicKey,
        this.selectedHandSigns
      )
      this.stage = MatchStage.ResultMatch
      this.isLoading = false
    } catch (err) {
      console.error(err)
      this._reset()
    }
  }

  close() {
    this.router.navigate(['../'])
  }

  private _changeProgress(value: number) {
    this.progress = value
  }

  private _reset() {
    this.stage = MatchStage.SelectHands
    this.keeperIsAvailable = this.keeperService.isAvailable()
    this.isLoading = false
    this.selectedHandSigns = []
    this.progress = null
  }
}
