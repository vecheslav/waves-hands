import { randomBytes } from 'crypto'
import { concat, sha256 } from '@waves/waves-crypto'
import { environment } from './environment'
import { MatchResult } from './interfaces'

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

const compareMoves = (m1: number, m2: number) =>
  ((m1 === 0 && m2 === 2) ||
    (m1 === 1 && m2 === 0) ||
    (m1 === 2 && m2 === 1)) ? 1 : (m1 === m2 ? 0 : -1)

export const whoHasWon = (p1: number[], p2: number[]) => {
  if (!p1 || !p2) {
    return
  }
  const score = p2.slice(0, 3).reduce((s, p2move, i) => s + compareMoves(p1[i], p2move), 0)
  return score > 0 ? MatchResult.Creator : (score === 0 ? MatchResult.Draw : MatchResult.Opponent)
}