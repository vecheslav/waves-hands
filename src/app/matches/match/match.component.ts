import { Component, Input, OnDestroy, OnInit } from '@angular/core'
import { HandSign, IMatch, MatchStage, Player, MatchStatus, PlayerMoves } from '../shared/match.interface'
import { ActivatedRoute, Router } from '@angular/router'
import { MatchesService } from '../matches.service'
import { KeeperService } from '../../auth/keeper.service'
import { IUser } from '../../user/user.interface'
import { UserService } from '../../user/user.service'
import { ErrorCode } from 'src/app/shared/error-code'

@Component({
  selector: 'app-match',
  templateUrl: './match.component.html',
  styleUrls: ['./match.component.scss']
})
export class MatchComponent implements OnInit, OnDestroy {
  match: IMatch

  stage: MatchStage = MatchStage.SelectHands
  matchStage = MatchStage
  selectedHandSigns: HandSign[] = []
  isCreatingMatch = false
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

  private handleErrors(err: any): boolean {
    if (err.code) {
      switch (err.code) {
        case ErrorCode.UserRejected:
          alert('ErrorCode.UserRejected')
          return true
        case ErrorCode.NotEnoughBalance:
          alert('ErrorCode.NotEnoughBalance')
          return true
      }
    }

    return false
  }

  ngOnInit() {
    this.isCreatingMatch = !this.match.address
    this._reset()

    if (this.stage === MatchStage.CreatedMatch) {
      this.match.creator.moves = this.matchesService.getMyMoves(this.match.address)
    }
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

      if (this.isCreatingMatch) {
        await this.create()
      } else {
        await this.join()
      }
    }
  }

  async create() {
    try {
      if (!this.user) {
        this.user = await this.userServices.authUser()
      }

      const match = await this.matchesService.createMatch(this.selectedHandSigns, this._changeProgress.bind(this))
      this.match = match
      this.shareUrl = window.location.origin + '/match/' + this.match.address
      this.stage = MatchStage.CreatedMatch
      this.isLoading = false
    } catch (err) {
      if (!this.handleErrors(err)) {
        console.error(err)
      }
      this._reset()
    }
  }

  async join() {
    try {
      if (!this.user) {
        this.user = await this.userServices.authUser()
      }

      await this.matchesService.joinMatch(
        this.match,
        this.selectedHandSigns,
        this._changeProgress.bind(this)
      )
      this.stage = MatchStage.JoinedMatch
      this.isLoading = false
    } catch (err) {
      if (!this.handleErrors(err)) {
        console.error(err)
      }
      this._reset()
    }
  }

  close() {
    this.router.navigate(['../'])
  }

  private _changeProgress(value: number) {
    this.progress = value
  }

  private _applyMatchStage() {
    if (this.isCreatingMatch) {
      this.stage = MatchStage.SelectHands
      return
    }

    switch (this.match.status) {
      case MatchStatus.New:
        if (this._isAsCreator()) {
          this.stage = MatchStage.CreatedMatch
        }
        break
      case MatchStatus.Waiting:
        if (this._isAsCreator()) {
          this.stage = MatchStage.ReservedMatch
        } else if (this._isAsOpponent) {
          this.stage = MatchStage.JoinedMatch
        } else {
          this.stage = MatchStage.ReservedMatch
        }
        break
      case MatchStatus.Done:
        if (this._isAsCreator()) {
          this.stage = (this.match.result === 0) ? MatchStage.WonMatch : MatchStage.LostMatch
        } else if (this._isAsOpponent()) {
          this.stage = (this.match.result === 1) ? MatchStage.WonMatch : MatchStage.LostMatch
        } else {
          this.stage = MatchStage.ResultMatch
        }
        if (this.match.result === 2 || typeof this.match.result === 'undefined') {
          this.stage = MatchStage.ResultMatch
        }
        break
      default:
        this.stage = MatchStage.SelectHands
    }
  }

  private _reset() {
    this._applyMatchStage()
    this.keeperIsAvailable = this.keeperService.isAvailable()
    this.isLoading = false
    this.selectedHandSigns = []
    this.progress = null
  }

  private _isAsCreator() {
    if (!this.match.creator) {
      return true
    }

    if (!this.user) {
      return false
    }

    return this.match.creator.address === this.user.address
  }

  private _isAsOpponent() {
    if (!this.match.opponent) {
      return false
    }

    if (!this.user) {
      return false
    }

    return this.match.opponent.address === this.user.address
  }
}
