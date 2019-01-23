import { IUser } from '../../user/user.interface'

export enum HandSign {
  Rock = 0,
  Paper = 1,
  Scissors = 2,
}

export interface Player {
  address: string
}

export type PlayerMoves = [HandSign, HandSign, HandSign]

export interface IPlayer extends IUser {
  moves?: PlayerMoves
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

export enum MatchResolve {
  Nothing,
  Accepted,
  CreatorMissed,
  OpponentWon,
  CreatorWon,
  Draw,
}

export interface IMatchChange {
  resolve: MatchResolve
  message?: string
  match?: IMatch
}

export interface IMatchTemp {
  isFinishing?: boolean
  owns?: boolean
}

export interface IMatch extends IMatchTemp {
  address: string
  publicKey: string
  creator: IPlayer
  opponent?: IPlayer
  reservationHeight?: number
  status: MatchStatus
  result?: MatchResult
  timestamp?: number
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
}
