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

  await s.payout(match)

  const [p1Balance, p2Balance] = await Promise.all([api.getBalance(player1Address), api.getBalance(player2Address)])

  return { p1Balance, p2Balance, player1Seed, player2Seed }
}

const createMatch = async (p1Moves: number[]) => {
  const { seed: player1Seed } = await randomAccountWithBalance(gameBet + defaultFee.transfer)
  const s = service(api, keeperMock([player1Seed]))

  const { match, move: p1Move, moveHash: p1MoveHash } = await s.create(p1Moves)

  return { player1Seed, p1Move, p1MoveHash, match }
}


it('get match', async () => {
  const s = service(api, keeperMock([]))
  await s.reveal({...EmptyMatch, status: MatchStatus.WaitingP2ToReveal}, Uint8Array.from([1,2,1]))
})

xit('create match and get it back', async () => {

  const p1Moves = [1, 1, 1]
  const p2Moves = [2, 2, 2]

  const { player1Address, player2Address, player1Seed, player2Seed } = await createPlayers()

  const s = service(api, keeperMock([player1Seed, player2Seed]))

  const { match, move: p1Move } = await s.create(p1Moves)

  let m: Match

  m = await s.match(match.address)
  expect(m.status).toBe(MatchStatus.WaitingForP2)

  await s.join(match, p2Moves)

  m = await s.match(match.address)
  expect(m.status).toBe(MatchStatus.WaitingP1ToReveal)

  await s.reveal(match, p1Move)

  m = await s.match(match.address)
  expect(m.status).toBe(MatchStatus.WaitingForPayout)

  await s.payout(match)

  m = await s.match(match.address)
  expect(m.status).toBe(MatchStatus.Done)
  expect(m.result).toBe(MatchResult.Opponent)

  const [p1Balance, p2Balance] = await Promise.all([api.getBalance(player1Address), api.getBalance(player2Address)])

  expect(p1Balance).toBe(0)
  expect(p2Balance).toBeGreaterThan(gameBet)
})

xit('match sunny day', async () => {
  const { p1Balance, p2Balance } = await playFullMatch([1, 1, 1], [2, 2, 2])

  expect(p1Balance).toBe(0)
  expect(p2Balance).toBeGreaterThan(gameBet)
})

xit('early payout', async () => {
  const { match } = await createMatch([1, 1, 1])

  const s = service(api, keeperMock([]))

  expect(s.payout(match)).rejects.toThrow()
})

xit('matches benchmark', async () => {
  const s = service(api, keeperMock([]))
  await benchmark(10, async () => await s.matches())
})
