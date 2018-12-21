export enum HandSign {
  Rock = 0,
  Paper = 1,
  Scissors = 2,
}

export interface Player {
  address: string
}

export type PlayerMoves = [HandSign, HandSign, HandSign]

export interface IPlayer {
  address: string
  publicKey: string
  moves?: PlayerMoves
}

export interface IMatch {
  address: string
  publicKey: string
  moveHash?: Uint8Array
  move?: Uint8Array
  creator: IPlayer
  opponent?: IPlayer
  status: MatchStatus
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
