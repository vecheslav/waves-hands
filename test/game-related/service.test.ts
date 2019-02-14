import { conf, testingHostSeed } from '../settings'
import { axiosHttp } from '../../src/app/hands/api-axios'
import { api as apiCtor } from '../../src/app/hands/api'
import { tests } from '..'
import { defaultFee } from '../fees'
import { gameBet } from '../../src/app/hands/game-related/game'
import { service } from '../../src/app/hands/game-related/service'
import { Match, MatchResult, MatchStatus, EmptyMatch } from '../../src/app/matches/shared/match.interface'
import { createPlayers, keeperMock } from '../generic'

jest.setTimeout(1000 * 60 * 60)

const api = apiCtor(conf, axiosHttp)
const { randomAccountWithBalance } = tests(testingHostSeed, api)

const benchmark = async (times: number, a: () => Promise<any>) => {
  let avg = 0
  let best = Number.MAX_SAFE_INTEGER
  let worst = 0

  for (let index = 0; index < times; index++) {
    let startTime = new Date().getTime()
    await (a())
    const elapsed = (new Date().getTime() - startTime)
    console.log(elapsed + 'mills')
    avg += elapsed / times
    if (best > elapsed)
      best = elapsed
    if (worst < elapsed)
      worst = elapsed
  }
  console.log('best: ' + best + 'mills')
  console.log('worst: ' + worst + 'mills')
  console.log('avg: ' + avg + 'mills')
}

const playFullMatch = async (p1Moves: number[], p2Moves: number[]) => {

  const { player1Address, player2Address, player1Seed, player2Seed } = await createPlayers()
  const s = service(api, keeperMock([player1Seed, player2Seed]))

  const { match, move: p1Move } = await s.create(p1Moves)

  await s.join(match, p2Moves)

  await s.reveal(match, p1Move)

  const [p1Balance, p2Balance] = await Promise.all([api.getBalance(player1Address), api.getBalance(player2Address)])

  return { p1Balance, p2Balance, player1Seed, player2Seed }
}

const createMatch = async (p1Moves: number[]) => {
  const { seed: player1Seed } = await randomAccountWithBalance(gameBet + defaultFee.transfer)
  const s = service(api, keeperMock([player1Seed]))

  const { match, move: p1Move, moveHash: p1MoveHash } = await s.create(p1Moves)

  return { player1Seed, p1Move, p1MoveHash, match }
}

xit('get match', async () => {
  const s = service(api, keeperMock([]))
  const m = await s.matches()
  console.log(m)
})

it('create match and get it back', async () => {

  const p1Moves = [1, 1, 1]
  const p2Moves = [2, 2, 2]

  const { player1Address, player2Address, player1Seed, player2Seed } = await createPlayers()

  const s = service(api, keeperMock([player1Seed, player2Seed, player2Seed]))

  const { match, move: p1Move } = await s.create(p1Moves)

  let mremote: Match = await s.match(match.address)
  let mlocal: Match = match

  expect(mlocal.status).toBe(MatchStatus.WaitingForP2)
  expect(mremote.status).toBe(MatchStatus.WaitingForP2)

  mlocal = await s.join(mlocal, p2Moves)
  mremote = await s.match(match.address)
  expect(mlocal.status).toBe(MatchStatus.WaitingP1ToReveal)
  expect(mremote.status).toBe(MatchStatus.WaitingP1ToReveal)

  mlocal = await s.reveal(mlocal, p1Move)
  mremote = await s.match(match.address)
  expect(mlocal.result).toBe(MatchResult.Opponent)
  expect(mlocal.result).toBe(MatchResult.Opponent)
  expect(mlocal.status).toBe(MatchStatus.WaitingForDeclare)
  expect(mremote.status).toBe(MatchStatus.WaitingForDeclare)

  const { match: m1, payout } = await s.declarePayout(mlocal)
  mlocal = m1
  mremote = await s.match(match.address)

  expect(mlocal.status).toBe(MatchStatus.WaitingForDeclare)
  expect(mremote.status).toBe(MatchStatus.WaitingForDeclare)

  mlocal = await s.payout(mlocal, payout)
  mremote = await s.match(match.address)

  expect(mremote.status).toBe(MatchStatus.Done)
  expect(mlocal.status).toBe(MatchStatus.Done)

  const [p1Balance, p2Balance] = await Promise.all([api.getBalance(player1Address), api.getBalance(player2Address)])

  expect(p1Balance).toBe(0)
  expect(p2Balance).toBeGreaterThan(gameBet)
})

xit('match sunny day', async () => {
  const { p1Balance, p2Balance } = await playFullMatch([1, 1, 1], [2, 2, 2])

  expect(p1Balance).toBe(0)
  expect(p2Balance).toBeGreaterThan(gameBet)
})

xit('matches benchmark', async () => {
  const s = service(api, keeperMock([]))
  await benchmark(10, async () => await s.matches())
})
