export interface IAction {
  timestamp?: number
  args?: any[]
  type: ActionType
}

export enum ActionType {
  CreatedMatch,
  JoinedMatch,
  AcceptedMatch,
  FinishedMatch,
  LostMatch,
  DrawMatch,
  WonMatch,
  WrongMatch,
}
