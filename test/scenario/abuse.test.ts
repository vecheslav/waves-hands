import { conf, testingHostSeed } from '../settings'
import { axiosHttp } from '../../src/app/hands/api-axios'
import { api as apiCtor } from '../../src/app/hands/api'
import { tests, printAddress, bruteForce, oneOf } from '..'
import { apiHelpers } from '../../src/app/hands/helpers'
import { defaultFee } from '../fees'
import { base58decode as from58 } from '@waves/waves-crypto'
import { compiledScript } from '../../src/app/hands/game-related/contract'
import { hideMoves, gameBet, serviceCommission, serviceAddress } from '../../src/app/hands/game-related/game'

jest.setTimeout(1000 * 60 * 60)

const api = apiCtor(conf, axiosHttp)
const { transferWaves, massTransferWaves, setKeysAndValues, setScript } = apiHelpers(api)
const { randomAccountWithBalance, randomAccount } = tests(testingHostSeed, api)

xit('abuse', async () => {
  const { seed: player1Seed, publicKey: player1Key, address: player1Address } =
    await randomAccountWithBalance(gameBet + defaultFee.transfer)

  const { seed: player2Seed, publicKey: player2Key, address: player2Address } =
    await randomAccountWithBalance(gameBet + defaultFee.transfer)

  const { seed: matchSeed, publicKey: matchKey, address: matchAddress } = randomAccount()

  const { moveHash: p1MoveHash, move: p1Move } = hideMoves([1, 1, 1])
  const { moveHash: p2MoveHash, move: p2Move } = hideMoves([2, 2, 2])

  printAddress('Match:', matchAddress)

  //#STEP1/4# P1 => C (+GameBet)
  const [
    { id: p1PaymentId },
    { id: p2PaymentId },
  ] = await Promise.all([
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

  await bruteForce(10, () => ({
    player2Key: oneOf([player1Key, player2Key]),
  }), (p) =>
      p.player2Key != player2Key,
    async ({ player2Key }) => {
      await setKeysAndValues({ publicKey: matchKey }, {
        'w': from58(player2Key),
      })
    })

  //#STEP9# winner
  await setKeysAndValues({ publicKey: matchKey }, {
    'w': from58(player2Key),
  })

  const matchBalance = (await api.getBalance(matchAddress)) - serviceCommission - 800000

  await bruteForce(100, () => ({
    looserAddress: oneOf([player1Address, player2Address]),
    winnerAddress: oneOf([player1Address, player2Address]),
    winnerReward: oneOf([matchBalance, 0, Math.round(Math.random() * matchBalance * 2)]),
    looserReward: oneOf([matchBalance, 0, Math.round(Math.random() * matchBalance * 2)]),
  }),
    (p) =>
      p.looserAddress != player1Address &&
      p.winnerAddress != player1Address &&
      p.winnerReward != matchBalance &&
      p.looserReward != 0,
    async ({ looserAddress, winnerAddress, winnerReward, looserReward }) => {
      await massTransferWaves({ publicKey: matchKey }, {
        [serviceAddress]: serviceCommission,
        [winnerAddress]: winnerReward,
        [looserAddress]: looserReward,
      }, { fee: 800000 })
    })

  //#STEP10# payout
  await massTransferWaves({ publicKey: matchKey }, {
    [serviceAddress]: serviceCommission,
    [player2Address]: matchBalance,
    [player1Address]: 0,
  }, { fee: 800000 })


})
