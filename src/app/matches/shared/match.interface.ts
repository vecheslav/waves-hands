export enum HandSign {
  Rock,
  Paper,
  Scissors,
}

export type HandSigns = [HandSign, HandSign, HandSign]

export interface IMatchInfo {
  address: string,
  timestamp: number,
  salt?: string,
}

export enum MatchStatus {
  Waiting,
  Done
}

export enum PlayerStatus {
  Waiting,
  Winner,
  Looser,
}
