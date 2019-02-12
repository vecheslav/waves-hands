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
  reservationHeight?: number
  status: MatchStatus
  result?: MatchResult
  timestamp?: number | string
}

export type IMatch = IBaseMatch & IMatchView & IMatchTransient

export const EmptyMatch: IMatch = {
  address: '',
  publicKey: '',
  creator: {
    address: '',
    publicKey: '',
  },
  timestamp: 0,
  status: MatchStatus.WaitingForP2,
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
