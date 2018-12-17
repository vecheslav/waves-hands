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
  id?: number,
  address?: string,
  players?: any[],
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
