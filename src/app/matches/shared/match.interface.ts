import { IUser } from '../../user/user.interface'

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
  NeedPayout,
  CreatorMissed,
  Won,
  Lost,
  Draw,
}

export interface IMatchResolve {
  type: MatchResolveType
  matchAddress?: string
}

export interface IMatchView {
  revealed?: boolean
  owns?: boolean
}

export interface IMatchTransient {
  isRevealing?: boolean
  isPayout?: boolean
}

export interface IBaseMatch {
  address: string
  publicKey: string
  creator: IPlayer
  opponent?: IPlayer
  winner?: string | 'draw'
  reservationHeight?: number
  status: MatchStatus
  result?: MatchResult
  timestamp?: number | string
}

export class Match implements IBaseMatch, IMatchView, IMatchTransient {
  opponent?: IPlayer
  reservationHeight?: number
  winner?: string
  result?: MatchResult
  revealed?: boolean
  owns?: boolean
  isRevealing?: boolean
  isPayout?: boolean


  constructor(
    private _publicKey: string,
    private _address: string,
    private _timestamp: number,
    private _creator: IPlayer
  ) { }

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

  private _done: boolean = false
  done() { this._done = true }

  get status(): MatchStatus {
    if (this._done)
      return MatchStatus.Done
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

export const EmptyMatch: Match = new Match('', '', 0, null)

export enum MatchStage {
  SelectHands,
  CompareHands,
  CreatedMatch,
  JoinedMatch,
  ReservedMatch,
  ResultMatch,
  WonMatch,
  LostMatch,
  DrawMatch,
}
