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
  New,
  Waiting,
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

export interface IMatchProcess {
  isRevealing?: boolean
}

export interface IMatch extends IMatchView {
  address: string
  publicKey: string
  creator: IPlayer
  opponent?: IPlayer
  reservationHeight?: number
  status: MatchStatus
  result?: MatchResult
  timestamp?: number | string
}

export const EmptyMatch: IMatch = {
  address: '',
  publicKey: '',
  creator: {
    address: '',
    publicKey: '',
  },
  timestamp: 0,
  status: MatchStatus.New,
  result: MatchResult.Creator,
}

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
