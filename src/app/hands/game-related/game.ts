import { randomBytes } from 'crypto'
import { concat, sha256 } from '@waves/waves-crypto'
import { environment } from '../../../environments/environment'

export const waves = 100000000
export const gameBet = 1 * waves
export const serviceCommission = gameBet / 200
export const serviceAddress = environment.serviceAddress

export const hideMoves = (moves: number[]) => {
  const salt = randomBytes(29)
  const move = concat([moves[0], moves[1], moves[2]], salt)
  const moveHash = sha256(move)
  return { salt, moveHash, move }
}
