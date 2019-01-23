export interface INotification {
  timestamp?: number
  params?: any[]
  type: NotificationType,
  message?: string,
  stored?: boolean
}

export enum NotificationType {
  Error = 'error',
  Warning = 'warning',
  Action = 'action',
  Info = 'info',
}

export enum ActionType {
  Receive = 'receive',
  Won = 'won',
  Lost = 'lost',
  Draw = 'draw',
  YouJoined = 'you_joined',
  YouCreated = 'you_created',
  OpponentJoined = 'opponent_joined',
}
