import { IWavesApi } from '../api'
import { apiHelpers } from '../helpers'
import { gameBet, hideMoves, serviceCommission, serviceAddress } from './game'
import { randomAccount } from './core'
import { base58decode as from58, address, base58encode } from '@waves/waves-crypto'
import { compiledScript } from './contract'
import '../extensions'
import { toKeysAndValuesExact, binary, num } from '../dataTxs'
import { Match, MatchStatus, MatchResult, HandSign, IMatchParams } from '../../matches/shared/match.interface'
import { IKeeper } from '../../../../src/app/auth/shared/keeper.interface'
import { MassTransferTransaction, TransferTransaction } from '../tx-interfaces'
import { IMassTransferTransaction, ITransferTransaction } from '@waves/waves-transactions'
import { TRANSACTION_TYPE } from '@waves/marshall/dist/schemas'

export interface CreateMatchResult {
  move: Uint8Array
  moveHash: Uint8Array
  match: Match
}

export interface IService {
  matches(): Promise<Match[]>
  match(address: string): Promise<Match>
  create(hands: number[], progress?: MatchProgress): Promise<CreateMatchResult>
  join(match: Match, hands: number[], progress?: MatchProgress): Promise<Match>
  reveal(match: Match, move: Uint8Array): Promise<Match>
  declareCashback(match: Match, paymentId: string): Promise<{ match: Match, cashback: ITransferTransaction }>
  cashback(cashback: ITransferTransaction): Promise<ITransferTransaction>
  declarePayout(match: Match): Promise<{ match: Match, payout: IMassTransferTransaction }>
  payout(match: Match, payout: IMassTransferTransaction): Promise<Match>
}

export type MatchProgress = (zeroToOne: number, message?: string) => void

export const service = (api: IWavesApi, keeper: IKeeper): IService => {
  const config = api.config()
  const { setKeysAndValues, setScript, prepareMassTransferWaves, prepareTransferWaves } = apiHelpers(api)

  const timeGap = 1000 * 60 * 5


  const ensureStatus = (match: Match, expectedStatus: MatchStatus, ...or: MatchStatus[]) => {
    if (match.status !== expectedStatus && or.filter(x => x === match.status).length == 0) {
      throw new Error(`Match status error, expected: ${MatchStatus[expectedStatus]}${or ? ' or ' + or.map(x => MatchStatus[x]).join('or ') : ''} actual: ${MatchStatus[match.status]}`)
    }
  }

  const matches = async (): Promise<Match[]> => {
    const matchScripts = await api.getSetScriptTxsByScript(compiledScript).then(s => s.map(x => ({ ...x, timestamp: Date.parse(x.timestamp.toString()) })).toRecord(x => x.sender))

    if (Object.keys(matchScripts).length == 0)
      return []

    const minMax = Object.values(matchScripts).minMax(x => x.timestamp)

    const p1Inits = toKeysAndValuesExact((await api.getDataTxsByKey({ key: 'p1mh', timeStart: minMax.min.timestamp - timeGap })), {
      'p1mh': binary,
      'mk': binary,
      'p1k': binary,
    },
      x => ({ sender: x.sender }))
      .map(x => ({
        sender: x.sender,
        p1mh: base58encode(x.p1mh),
        p1k: base58encode(x.p1k),
        mk: base58encode(x.mk),
      }))
      .toRecord(x => x.sender)

    const p2Inits = toKeysAndValuesExact((await api.getDataTxsByKey({ key: 'p2mh', timeStart: minMax.min.timestamp - timeGap })), {
      'p2mh': binary,
      'p2k': binary,
      'h': num,
    },
      x => ({ sender: x.sender }))
      .map(x => ({
        sender: x.sender,
        p2mh: base58encode(x.p2mh),
        p2k: base58encode(x.p2k),
        h: x.h,
      }))
      .toRecord(x => x.sender)

    const p2Reveals = toKeysAndValuesExact((await api.getDataTxsByKey({ key: 'p2m', timeStart: minMax.min.timestamp - timeGap })), {
      'p2m': binary,
    },
      x => ({ sender: x.sender }))
      .toRecord(x => x.sender)

    const p1Reveals = toKeysAndValuesExact((await api.getDataTxsByKey({ key: 'p1m', timeStart: minMax.min.timestamp - timeGap })), {
      'p1m': binary,
    },
      x => ({ sender: x.sender }))
      .toRecord(x => x.sender)

    const declares = toKeysAndValuesExact((await api.getDataTxsByKey({ key: 'w', timeStart: minMax.min.timestamp - timeGap })), {
      'w': binary,
    },
      x => ({ sender: x.sender }))
      .map(x => ({
        sender: x.sender,
        w: base58encode(x.w),
      }))
      .toRecord(x => x.sender)

    const payouts = (await api.getMassTransfers({ recipient: serviceAddress, timeStart: minMax.min.timestamp })).toRecord(x => x.sender)

    const h = await api.getHeight()

    return Object.keys(matchScripts).map(a => {
      if (!p1Inits[a])
        return undefined

      const match: IMatchParams = {
        publicKey: matchScripts[a].senderPublicKey,
        address: a,
        timestamp: matchScripts[a].timestamp,
        creator: {
          address: address({ public: p1Inits[a].p1k }, config.chainId),
          publicKey: p1Inits[a].p1k,
        },
      }

      if (p2Inits[a]) {
        const { h, p2k } = p2Inits[a]
        match.opponent = {
          address: address({ public: p2k }, config.chainId),
          publicKey: p2k,
        }
        match.reservationHeight = h
      }

      if (p2Reveals[a]) {
        const { p2m } = p2Reveals[a]
        match.opponent!.moves = [p2m[0], p2m[1], p2m[2]] as [HandSign, HandSign, HandSign]
      }

      if (p1Reveals[a]) {
        const { p1m } = p1Reveals[a]
        match.creator.moves = [p1m[0], p1m[1], p1m[2]] as [HandSign, HandSign, HandSign]
      }

      if (declares[a]) {
        const { w } = declares[a]
        match.winner = w

      }
      else {
        console.log('NO DECLARES!')
      }
      const m = Match.create(match)

      m.height(h)

      if (payouts[a]) {
        m.done()
      }

      return m
    }).filter(x => x !== undefined) as Match[]
  }

  return {

    matches,

    match: async (address: string): Promise<Match> => {
      const m = (await matches()).filter(m => m.address == address)
      if (m.length == 1)
        return m[0]
      else throw new Error('Match not found')
    },

    create: async (hands: number[], progress: MatchProgress = () => { }): Promise<CreateMatchResult> => {
      const { seed: matchSeed, address: matchAddress, publicKey: matchKey } = randomAccount(config.chainId)

      progress(0)
      // #STEP1 P1 => C (+GameBet)
      const p1p = await keeper.prepareWavesTransfer(matchAddress, gameBet)
      progress(.15)

      const { senderPublicKey: player1Key } = await api.broadcastAndWait(p1p)
      const { move, moveHash } = hideMoves(hands)

      progress(.4)
      // #STEP2# C => data
      await setKeysAndValues({ seed: matchSeed }, { 'p1k': from58(player1Key), 'p1mh': moveHash, 'mk': from58(matchKey), })

      progress(.8)
      // #STEP3# C => script
      const s = await setScript(matchSeed, compiledScript)

      progress(1)

      return {
        move,
        moveHash,
        match: Match.create({
          publicKey: matchKey, address: matchAddress, timestamp: s.timestamp, creator: {
            address: address({ public: player1Key }, config.chainId),
            publicKey: player1Key,
          },
        }),
      }
    },

    join: async (match: Match, hands: number[], progress: MatchProgress = () => { }): Promise<Match> => {
      ensureStatus(match, MatchStatus.WaitingForP2)

      progress(0)
      const { setKeysAndValues } = apiHelpers(api)
      const matchKey = match.publicKey
      const matchAddress = address({ public: matchKey }, config.chainId)

      //#STEP4# P2 => bet
      const p2p = await keeper.prepareWavesTransfer(matchAddress, gameBet)
      progress(.15)

      const { id: p2PaymentId, senderPublicKey: player2Key } = await api.broadcastAndWait(p2p)
      const { move, moveHash } = hideMoves(hands)

      progress(.4)
      //#STEP5# P2 => move
      const h = await api.getHeight()
      await setKeysAndValues({ publicKey: matchKey }, { 'p2k': from58(player2Key), 'p2mh': moveHash, 'h': h, 'p2p': from58(p2PaymentId) })

      progress(.8)
      //#STEP6# P2 => reveal
      await setKeysAndValues({ publicKey: matchKey }, { 'p2m': move })

      progress(1)

      //update match

      const m = Match.create({
        ...Match.toPlain(match),
        reservationHeight: h,
        opponent: {
          publicKey: player2Key,
          address: address({ public: player2Key }, config.chainId),
          moves: [move[0], move[1], move[2]] as [HandSign, HandSign, HandSign],
        },
      })

      return m
    },

    reveal: async (match: Match, move: Uint8Array): Promise<Match> => {
      ensureStatus(match, MatchStatus.WaitingP1ToReveal, MatchStatus.WaitingBothToReveal)

      //#STEP7# P1 => reveal
      await setKeysAndValues({ publicKey: match.publicKey }, { 'p1m': move })

      //update match
      match.creator.moves = [move[0], move[1], move[2]] as [HandSign, HandSign, HandSign]

      return match
    },

    declareCashback: async (match: Match, paymentId: string): Promise<{ match: Match, cashback: ITransferTransaction }> => {
      const payment = await api.getTxById(paymentId) as TransferTransaction
      if (payment.type !== TRANSACTION_TYPE.TRANSFER)
        throw new Error('Invalid payment')

      const cashback = prepareTransferWaves({ publicKey: match.publicKey }, { address: payment.sender }, gameBet)

      const tx = await keeper.prepareDataTransaction({
        [payment.id]: true,
        [cashback.id]: true,
        [payment.senderPublicKey]: true,
      }, match.publicKey)

      await api.broadcastAndWait(tx)

      return { match, cashback }
    },

    cashback: async (cb: ITransferTransaction): Promise<ITransferTransaction> => {
      return await api.broadcastAndWait(cb) as ITransferTransaction
    },

    declarePayout: async (match: Match): Promise<{ match: Match, payout: IMassTransferTransaction }> => {
      ensureStatus(match, MatchStatus.WaitingForDeclare)

      const w = match.result == MatchResult.Draw ? '1' : match.result == MatchResult.Creator ? match.creator.publicKey : match.opponent.publicKey
      //#STEP8# Winner => declare
      //await setKeysAndValues({ publicKey: match.publicKey }, { 'w': from58(w), })

      const winner = match.result == MatchResult.Opponent ? match.opponent!.address : match.creator.address
      const looser = match.result == MatchResult.Opponent ? match.creator.address : match.opponent!.address

      const matchBalance = (await api.getBalance(match.address)) - serviceCommission - 700000
      const payout = prepareMassTransferWaves({ publicKey: match.publicKey }, {
        [serviceAddress]: serviceCommission,
        [winner]: match.result == MatchResult.Draw ? matchBalance / 2 : matchBalance,
        [looser]: match.result == MatchResult.Draw ? matchBalance / 2 : 0,
      }, { fee: 700000 })

      const tx = await keeper.prepareDataTransaction({
        'w': from58(w),
        [payout.id]: true,
      }, match.publicKey)

      await api.broadcastAndWait(tx)

      return { match, payout }
    },

    payout: async (match: Match, payout: MassTransferTransaction): Promise<Match> => {
      ensureStatus(match, MatchStatus.WaitingForPayout)

      if (!match.reservationHeight)
        throw new Error('There is no reservation height on match')

      if (!match.opponent)
        throw new Error('Match opponent is empty')


      //#STEP9# payout
      await api.broadcastAndWait(payout)

      match.done()

      return match
    },
  }
}
