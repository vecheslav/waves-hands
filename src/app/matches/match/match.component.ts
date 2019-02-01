import { Component, OnDestroy, OnInit } from '@angular/core'
import { EmptyMatch, HandSign, IMatch, IPlayer, MatchResult, MatchStage, MatchStatus, PlayerStatus } from '../shared/match.interface'
import { ActivatedRoute, Router } from '@angular/router'
import { MatchesService } from '../matches.service'
import { KeeperService } from '../../auth/keeper.service'
import { IUser } from '../../user/user.interface'
import { UserService } from '../../user/user.service'
import { ErrorCode } from 'src/app/shared/error-code'
import { NotificationsService } from '../../notifications/notifications.service'
import { NotificationType } from '../../notifications/notifications.interface'
import { from, timer } from 'rxjs'
import { environment } from '../../../environments/environment'

const REVEAL_HEIGHT = environment.creatorRevealBlocksCount + 1
const BLOCK_AS_MS = 60 * 1000

@Component({
  selector: 'app-match',
  templateUrl: './match.component.html',
  styleUrls: ['./match.component.scss']
})
export class MatchComponent implements OnInit, OnDestroy {
  match: IMatch = EmptyMatch

  stage: MatchStage = MatchStage.SelectHands
  matchStage = MatchStage
  selectedHandSigns: HandSign[] = []
  isCreatingMatch = false
  user: IUser

  creator: IPlayer
  opponent: IPlayer

  isLoading = true
  keeperIsAvailable = true
  isProccesing = false
  progress = null
  shareUrl: string

  pendingLeftPercent = 100
  private _pendingSubscriber

  private _userSubscriber
  private _matchSubscriber
  private _heightSubscriber

  private _currentHeight

  constructor(private router: Router,
              private route: ActivatedRoute,
              private keeperService: KeeperService,
              private matchesService: MatchesService,
              private userServices: UserService,
              private notificationsService: NotificationsService) {
    const matchAddress = this.route.snapshot.paramMap.get('address')

    if (matchAddress) {
      // Exist match
      from(this.matchesService.getMatch(matchAddress))
        .subscribe((match: IMatch) => {
          this.match = match

          this._init()
        })
    } else {
      // Creating match
      this._init()
    }

    this._userSubscriber = this.userServices.user$.subscribe((user: IUser) => {
      this.user = user
      this._updateParticipants()
    })
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    this._userSubscriber.unsubscribe()
    this._matchSubscriber.unsubscribe()

    if (this._pendingSubscriber) {
      this._pendingSubscriber.unsubscribe()
    }

    if (this._heightSubscriber) {
      this._heightSubscriber.unsubscribe()
    }
  }

  async select(handSign: HandSign) {
    if (this.stage !== MatchStage.SelectHands) {
      return
    }
    this.selectedHandSigns.push(handSign)

    if (this.selectedHandSigns.length === 3) {
      this.isProccesing = true

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
      this.router.navigate(['match', match.address])
    } catch (err) {
      if (!this._handleErrors(err)) {
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
      this.isProccesing = false

      this.match.status = MatchStatus.Waiting
      this.match.reservationHeight = this.matchesService.currentHeight$.getValue()
      this._initLeftPercent()
    } catch (err) {
      if (!this._handleErrors(err)) {
        console.error(err)
      }
      this._reset()
    }
  }

  close() {
    this.router.navigate(['../'])
  }

  private _init() {
    this.isCreatingMatch = !this.match.address
    this._reset()
    this._updateParticipants()

    if (this.stage === MatchStage.CreatedMatch) {
      this.shareUrl = window.location.origin + '/match/' + this.match.address
      this.match.creator.moves = this.matchesService.getMyMoves(this.match.address)
    }

    this.isLoading = false

    this._heightSubscriber = this.matchesService.currentHeight$.subscribe(height => {
      if (height && height !== this._currentHeight) {
        this._currentHeight = height
        this._initLeftPercent()
      }
    })

    this._matchSubscriber = this.matchesService.currentMatch$.subscribe((match: IMatch) => {
      if (!match) {
        return
      }

      if (this.stage !== MatchStage.SelectHands && match.status > MatchStatus.New) {
        console.log('Update match', match.address)
        // Update match
        this.isCreatingMatch = false
        this.match = match
        this._reset()
        this._updateParticipants()
      }
    })
  }

  private _handleErrors(err: any): boolean {
    if (err.code) {
      switch (err.code) {
        case ErrorCode.UserRejected:
          this.notificationsService.add({
            type: NotificationType.Error,
            message: 'ERROR_USER_REJECTED'
          })
          return true
        case ErrorCode.NotEnoughBalance:
          this.notificationsService.add({
            type: NotificationType.Error,
            message: 'ERROR_BALANCE'
          })
          return true
      }
    }

    return false
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
        } else if (this._isAsOpponent()) {
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
        if (this.match.result === 2) {
          this.stage = MatchStage.DrawMatch
        } else if (typeof this.match.result === 'undefined') {
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
    this.isProccesing = false
    this.selectedHandSigns = []
    this.progress = null
  }

  private _updateParticipants() {
    this.creator = this.match.creator
    this.opponent = (this.match.status === 0) ? this.user : this.match.opponent

    if (this.match.status === MatchStatus.Done) {
      if (this.match.result < MatchResult.Draw) {
        this.creator.status = this.match.result === MatchResult.Creator ? PlayerStatus.Winner : PlayerStatus.Looser
        this.opponent.status = this.match.result === MatchResult.Opponent ? PlayerStatus.Winner : PlayerStatus.Looser
      }
    }
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

  private _initLeftPercent() {
    if (this.match.status === MatchStatus.Waiting && this.match.reservationHeight) {
      const heightPassed = this._currentHeight - this.match.reservationHeight
      const leftHeight = Math.max(REVEAL_HEIGHT - heightPassed, 0)
      this.pendingLeftPercent = leftHeight * 100 / REVEAL_HEIGHT

      if (this._pendingSubscriber) {
        this._pendingSubscriber.unsubscribe()
      }

      // TODO: hack infinite descent
      const end = (leftHeight - 1) * BLOCK_AS_MS
      // Start timer
      this._pendingSubscriber = timer(0, 1000).subscribe(val => {
        const step = BLOCK_AS_MS / (1 + (val / 20))
        const left = Math.max(end + step, 0)
        this.pendingLeftPercent = left * 100 / (REVEAL_HEIGHT * BLOCK_AS_MS)
      })
    }
  }
}
