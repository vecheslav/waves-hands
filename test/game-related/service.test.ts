import { conf, testingHostSeed } from '../settings'
import { axiosHttp } from '../../src/app/hands/api-axios'
import { api as apiCtor } from '../../src/app/hands/api'
import { tests, printAddress, bruteForce, oneOf } from '..'
import { apiHelpers } from '../../src/app/hands/helpers'
import { defaultFee } from '../fees'
import { base58decode as from58, address, publicKey, base58encode } from '@waves/waves-crypto'
import { compiledScript } from '../../src/app/hands/game-related/contract'
import { hideMoves, gameBet, serviceCommission, serviceAddress } from '../../src/app/hands/game-related/game'
import { service } from '../../src/app/hands/game-related/service'
import { IKeeper, KeeperAuth, KeeperPublicState } from '../../src/app/hands/keeper/interfaces'
import { transfer, TTx, ITransferTransaction } from '@waves/waves-transactions'
import { BASE64_STRING } from '@waves/marshall/dist/serializePrimitives'
import { IMatch, MatchResult, MatchStatus } from '../../src/app/matches/shared/match.interface'

jest.setTimeout(1000 * 60 * 60)

const api = apiCtor(conf, axiosHttp)
const config = api.config()
const keeperMock = (seeds: string[]): IKeeper => {

  let i = 0

  return {
    on: (event: string, cb: (state: any) => void) => { },
    auth: (param?: { data: string }): Promise<KeeperAuth> => Promise.resolve<KeeperAuth>({
      address: '',
      data: '',
      host: 'string',
      prefix: 'WavesWalletAuthentication',
      publicKey: '',
      signature: 'string',
    }),
    signTransaction: (p: { type: number, data: any }): Promise<TTx> => Promise.resolve(transfer({ recipient: '', amount: 1 }, '')),
    prepareWavesTransfer: (recipient: string, amount: number): Promise<ITransferTransaction> => Promise.resolve(transfer({ recipient, amount }, seeds[i++])),
    publicState: (): Promise<KeeperPublicState> => Promise.resolve<KeeperPublicState>({
      initialized: false,
      locked: false,
    }),
  }
}

const createPlayers = async () => {
  const [
    { seed: player1Seed, address: player1Address },
    { seed: player2Seed, address: player2Address },
  ] = await Promise.all(
    [randomAccountWithBalance(gameBet + defaultFee.transfer),
    randomAccountWithBalance(gameBet + defaultFee.transfer)]
  )

  return { player1Address, player2Address, player1Seed, player2Seed }
}

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

  const { match, move: p1Move, moveHash: p1MoveHash } = await s.create(p1Moves)

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

const { randomAccountWithBalance } = tests(testingHostSeed, api)

xit('get match', async () => {
  const matchAddress = '3N92yfWhjrkCDJJfrg9H6SGT9fjHQiHwrr7'

  const s = service(api, keeperMock([]))

  const m = await s.match(matchAddress)

  console.log(m)
})

it('create match and get it back', async () => {

  const p1Moves = [1, 1, 1]
  const p2Moves = [2, 2, 2]

  const { player1Address, player2Address, player1Seed, player2Seed } = await createPlayers()

  const s = service(api, keeperMock([player1Seed, player2Seed]))

  const { match, move: p1Move, moveHash: p1MoveHash } = await s.create(p1Moves)

  let m: IMatch

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
