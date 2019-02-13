
import { api as apiCtor } from '../src/app/hands/api'
import { axiosHttp } from '../src/app/hands/api-axios'
import { address } from '@waves/waves-crypto'
import { testnetConfig } from '../src/app/hands/config'
import { testingHostSeed, conf } from './settings'
import { tests } from '.'

const api = apiCtor(testnetConfig, axiosHttp)
const { randomSeedWithBalance } = tests(testingHostSeed, api)

jest.setTimeout(1000 * 60)

// beforeAll(async (cb) => {
//   const a = address(seed, conf.chainId)
//   const balance = await api.getBalance(a)
//   if (balance < 100000)
//     throw new Error(`Not enouth balance on ${a} to run test scenario`)

//   cb()
// })


it('should create seed with balance', async () => {
  const player1seed = await randomSeedWithBalance(1)
  const balance = await api.getBalance(address(player1seed, conf.chainId))
  expect(balance).toEqual(1)
})

