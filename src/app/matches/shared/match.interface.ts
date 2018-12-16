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

export interface Match {
  id?: string,
  players?: any[],
}

export enum MatchStage {
  SelectHands,
  CreatedMatch,
  CompareHands,
  ResultMatch
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
