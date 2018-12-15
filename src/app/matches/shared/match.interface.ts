export enum HandSign {
  Rock = 0,
  Paper = 1,
  Scissors = 2,
}

export type HandSigns = [HandSign, HandSign, HandSign]

export interface IMatchInfo {
  address: string,
  timestamp: number,
  salt?: string,
}
