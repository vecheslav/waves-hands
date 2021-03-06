
// Message to text
// export const messageText: Record<string, string | any> = {
//   ERROR_USER_REJECTED: 'You rejected process',
//   ERROR_BALANCE: 'Not enouth balance',
//   ERROR_API_REJECTED: 'You rejected access to keeper',
//   ERROR_WRONG_MATCH: 'Something went wrong',
//   ACTION_RECEIVE: 'You received a reward of {1} Waves for the match #{2}',
//   ACTION_WON: 'You won the match #{1}',
//   ACTION_LOST: 'You lost the match #{1}',
//   ACTION_DRAW: 'Your match #{1} has been completed with a draw',
//   ACTION_YOU_CREATED: 'You created a match #{1}',
//   ACTION_YOU_JOINED: 'You joined a match #{1}',
//   ACTION_OPPONENT_JOINED: 'Opponent joined to match #{1}'
// }

export const messageIcon: Record<string, string> = {
  ERROR: 'error_outline',
  WARNING: 'error_outline',
  INFO: 'info_outline',
  PROCESS: 'spinner8',
  ACTION_RECEIVE: 'notifications_none',
  ACTION_WON: 'sentiment_satisfied',
  ACTION_LOST: 'sentiment_dissatisfied',
  ACTION_DRAW: 'sentiment_neutral',
  ACTION_YOU_CREATED: 'check',
  ACTION_YOU_JOINED: 'add',
  ACTION_OPPONENT_JOINED: 'person_add'
}
