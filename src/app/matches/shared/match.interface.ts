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
  Lost,
  Draw,
  Won
}

export interface IMatchChange {
  resolve: MatchResolve
  message?: string
  match?: IMatch
}

export interface IMatch {
  address: string
  publicKey: string
  creator: IPlayer
  opponent?: IPlayer
  status: MatchStatus,
  result?: MatchResult,
}

export const EmptyMatch: IMatch = {
  address: '',
  publicKey: '',
  creator: {
    address: '',
    publicKey: '',
  },
  status: MatchStatus.New,
  result: MatchResult.Creator,
}

export enum MatchStage {
  SelectHands,
  CreatedMatch,
  CompareHands,
  ResultMatch,
}
