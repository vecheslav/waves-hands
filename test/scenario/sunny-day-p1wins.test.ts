import { conf, testingHostSeed } from '../settings'
import { axiosHttp } from '../../src/app/hands/api-axios'
import { api as apiCtor } from '../../src/app/hands/api'
import { tests, printAddress } from '..'
import { apiHelpers } from '../../src/app/hands/helpers'
import { defaultFee } from '../fees'
import { base58decode as from58 } from '@waves/waves-crypto'
import { compiledScript } from '../../src/app/hands/game-related/contract'
import { hideMoves, gameBet, serviceCommission, serviceAddress } from '../../src/app/hands/game-related/game'

jest.setTimeout(1000 * 60 * 10)

const api = apiCtor(conf, axiosHttp)
const { transferWaves, massTransferWaves, setKeysAndValues, setScript } = apiHelpers(api)
const { randomAccountWithBalance, randomAccount } = tests(testingHostSeed, api)

xit('sunny day p1 wins', async () => {
  const { seed: player1Seed, publicKey: player1Key, address: player1Address } =
    await randomAccountWithBalance(gameBet + defaultFee.transfer)

  const { seed: player2Seed, publicKey: player2Key, address: player2Address } =
    await randomAccountWithBalance(gameBet + defaultFee.transfer)

  const { seed: matchSeed, publicKey: matchKey, address: matchAddress } = randomAccount()

  const { moveHash: p1MoveHash, move: p1Move } = hideMoves([1, 1, 1])
  const { moveHash: p2MoveHash, move: p2Move } = hideMoves([0, 0, 0])

  printAddress('Match:', matchAddress)

  //#STEP1/3# P1 => C (+GameBet)
  const [{ id: p1PaymentId }, { id: p2PaymentId }] = await Promise.all([
    await transferWaves({ seed: player1Seed }, { address: matchAddress }, gameBet),
    await transferWaves({ seed: player2Seed }, { address: matchAddress }, gameBet),
  ])
  //#STEP2# C => data
  await setKeysAndValues({ seed: matchSeed }, { 'p1k': from58(player1Key), 'p1mh': p1MoveHash, 'mk': from58(matchKey), })
  //#STEP3# C => script
  await setScript(matchSeed, compiledScript)

  //#STEP5# P2 => move
  const h = await api.getHeight()
  await setKeysAndValues({ publicKey: matchKey }, { 'p2k': from58(player2Key), 'p2mh': p2MoveHash, 'h': h, 'p2p': from58(p2PaymentId) })
  //#STEP6/7# P1/P2 => reveal
  await Promise.all([
    setKeysAndValues({ publicKey: matchKey }, { 'p2m': p2Move }),
    setKeysAndValues({ publicKey: matchKey }, { 'p1m': p1Move })])

  //#STEP9# winner
  await setKeysAndValues({ publicKey: matchKey }, {
    'w': from58(player1Key),
  })

  //#STEP10# payout
  const matchBalance = (await api.getBalance(matchAddress)) - serviceCommission - 800000
  await massTransferWaves({ publicKey: matchKey }, {
    [serviceAddress]: serviceCommission,
    [player1Address]: matchBalance,
    [player2Address]: 0,
  }, { fee: 800000 })


})
