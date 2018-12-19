export enum HandSign {
  Rock,
  Paper,
  Scissors,
}

export interface IMatchInfo {
  address: string,
  timestamp: number,
  salt?: string,
}

export type PlayerMoves = [HandSign, HandSign, HandSign]

export interface IPlayer {
  address: string,
  moves?: PlayerMoves
}

export interface IMatch {
  id?: number,
  address?: string,
  players?: IPlayer[],
  winner?: string,
  status?: MatchStatus,
}

export enum MatchStage {
  SelectHands,
  CreatedMatch,
  CompareHands,
  ResultMatch,
}

export enum MatchStatus {
  New,
  Waiting,
  Done,
}
