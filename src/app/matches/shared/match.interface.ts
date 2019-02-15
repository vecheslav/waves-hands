import { IUser } from '../../user/user.interface'
import { environment } from '../../../../src/environments/environment'

export enum HandSign {
  Rock = 0,
  Paper = 1,
  Scissors = 2,
}

export enum PlayerStatus {
  Nothing,
  Looser,
  Winner,
}

export interface Player {
  address: string
}

export type PlayerMoves = [HandSign, HandSign, HandSign]

export interface IPlayer extends IUser {
  moves?: PlayerMoves
  status?: PlayerStatus
}

export enum MatchStatus {
  WaitingForP2,
  WaitingBothToReveal,
  WaitingP2ToReveal,
  WaitingP1ToReveal,
  WaitingForDeclare,
  WaitingForPayout,
  Done,
}

export enum MatchResult {
  Creator,
  Opponent,
  Draw,
}

export enum MatchResolveType {
  Nothing,
  Accepted,
  NeedReveal,
  NeedRevoke,
  NeedPayout,
  Won,
  Lost,
  Draw,
}

export enum RevokedStatus {
  None = 0,
  Need = 1,
  Done = 2,
}

export interface IMatchResolve {
  type: MatchResolveType
  matchAddress?: string
}

export interface IMatchView {
  revealed?: boolean
  owns?: boolean
  canDeclare?: boolean
  revoked?: RevokedStatus
}

export interface IMatchTransient {
  isRevealing?: boolean
  isPayout?: boolean
}

export interface IMatchParams {
  address: string
  publicKey: string
  creator: IPlayer
  opponent?: IPlayer
  winner?: string | 'draw'
  reservationHeight?: number
  timestamp: number
  payout?: boolean
}

export interface IBaseMatch extends IMatchParams {
  status?: MatchStatus
  result?: MatchResult
}

export type IMatch = IBaseMatch & IMatchView & IMatchTransient

export class Match implements IMatch {
  revealed?: boolean
  owns?: boolean
  canDeclare?: boolean
  revoked?: RevokedStatus
  isRevealing?: boolean
  isPayout?: boolean

  static create(match: (IMatchParams & IMatchView & IMatchTransient) | Match) {
    const m = new Match(
      match.publicKey,
      match.address,
      match.timestamp,
      match.creator,
      match.opponent,
      match.reservationHeight,
      match.winner,
      match.payout)

    m.owns = match.owns
    m.canDeclare = match.canDeclare
    m.revoked = match.revoked
    m.revealed = match.revealed
    m.isPayout = match.isPayout
    m.isRevealing = match.isRevealing

    return m
  }

  static toPlain(match: Match): IMatch {

    if (!match)
      return undefined

    return {
      address: match.address,
      publicKey: match.publicKey,
      creator: match.creator,
      opponent: match.opponent,
      winner: match.winner,
      reservationHeight: match.reservationHeight,
      timestamp: match.timestamp,
      payout: match.payout,
      isRevealing: match.isRevealing,
      isPayout: match.isPayout,
      revealed: match.revealed,
      revoked: match.revoked,
      status: match.status,
      result: match.result,
    }
  }

  private constructor(
    private _publicKey: string,
    private _address: string,
    private _timestamp: number,
    private _creator: IPlayer,
    private _opponent?: IPlayer,
    private _reservationHeight?: number,
    private _winner?: string,
    private _payout?: boolean
  ) { }

  get payout() {
    return this._payout
  }

  get winner() {
    return this._winner
  }

  get reservationHeight() {
    return this._reservationHeight
  }

  get opponent() {
    return this._opponent
  }

  get creator() {
    return this._creator
  }
  get timestamp() {
    return this._timestamp
  }

  get address() {
    return this._address
  }

  get publicKey() {
    return this._publicKey
  }

  get timeout() {
    return this._timeout
  }

  private _timeout: boolean = false
  height(h: number) {
    this._timeout = h - this._reservationHeight > environment.creatorRevealBlocksCount
  }

  private _compareMoves = (m1: number, m2: number) =>
    ((m1 === 0 && m2 === 2) ||
      (m1 === 1 && m2 === 0) ||
      (m1 === 2 && m2 === 1)) ? 1 : (m1 === m2 ? 0 : -1)

  private _whoHasWon(p1: number[], p2: number[]) {
    if (!p1 && !p2) {
      return MatchResult.Draw
    }
    else if (!p1) {
      return MatchResult.Opponent
    }
    else if (!p2) {
      return MatchResult.Creator
    }

    const score = p2.slice(0, 3).reduce((s, p2move, i) => s + this._compareMoves(p1[i], p2move), 0)
    return score > 0 ? MatchResult.Creator : (score === 0 ? MatchResult.Draw : MatchResult.Opponent)
  }

  get result(): MatchResult {
    if (this.status < MatchStatus.WaitingForDeclare)
      return undefined

    return this._whoHasWon(this.creator.moves, this.opponent.moves)
  }

  get status(): MatchStatus {
    if (this._payout)
      return MatchStatus.Done
    if (this._timeout)
      return MatchStatus.WaitingForDeclare
    if (!this.opponent)
      return MatchStatus.WaitingForP2
    if (!this.opponent.moves && !this.creator.moves)
      return MatchStatus.WaitingBothToReveal
    if (!this.creator.moves)
      return MatchStatus.WaitingP1ToReveal
    if (!this.opponent.moves)
      return MatchStatus.WaitingP2ToReveal
    if (!this.winner)
      return MatchStatus.WaitingForDeclare

    return MatchStatus.WaitingForPayout
  }
}

export const EmptyMatch: Match = Match.create({ publicKey: '', address: '', timestamp: 0, creator: null })

export enum MatchStage {
  SelectHands,
  CreatedMatch,
  JoinedMatch,
  ReservedMatch,
  ResultMatch,
  WonMatch,
  LostMatch,
  DrawMatch,
}
