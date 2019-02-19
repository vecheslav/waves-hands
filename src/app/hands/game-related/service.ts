import { IWavesApi, retry } from '../api'
import { apiHelpers } from '../helpers'
import { computeMatchStatus, gameBet, hideMoves, serviceAddress, serviceCommission, whoHasWon } from './game'
import { randomAccount } from './core'
import { address, base58decode as from58, base58encode } from '@waves/waves-crypto'
import { compiledScript } from './contract'
import '../extensions'
import { binary, num, toKeysAndValuesExact } from '../dataTxs'
import { EmptyMatch, HandSign, IMatch, MatchResult, MatchStatus } from '../../matches/shared/match.interface'
import { IKeeper } from '../../../../src/app/auth/shared/keeper.interface'
import { TransferTransaction } from '../tx-interfaces'
import { IMassTransferTransaction, ITransferTransaction } from '@waves/waves-transactions'
import { TRANSACTION_TYPE } from '@waves/marshall/dist/schemas'

export interface CreateMatchResult {
  move: Uint8Array
  moveHash: Uint8Array
  match: IMatch
}

export interface MatchesResult {
  matches: Record<string, IMatch>
  currentHeight: number
}

export interface IService {
  matches(): Promise<MatchesResult>
  match(address: string): Promise<IMatch>
  create(hands: number[], progress?: MatchProgress): Promise<CreateMatchResult>
  join(match: IMatch, hands: number[], progress?: MatchProgress): Promise<{ match: IMatch, error: any }>
  reveal(match: IMatch, move: Uint8Array): Promise<IMatch>
  declareCashback(match: IMatch, paymentId: string): Promise<{ match: IMatch, cashback: ITransferTransaction }>
  cashback(cashback: ITransferTransaction): Promise<ITransferTransaction>
  declarePayout(match: IMatch): Promise<{ match: IMatch, payout: IMassTransferTransaction }>
  payout(match: IMatch, payout: IMassTransferTransaction): Promise<IMatch>
}

export type MatchProgress = (zeroToOne: number, message?: string) => void

export const service = (api: IWavesApi, keeper: IKeeper): IService => {
  const config = api.config()
  const { setKeysAndValues, setScript, prepareMassTransferWaves, prepareTransferWaves } = apiHelpers(api)

  const timeGap = 1000 * 60 * 5


  const ensureStatus = (match: IMatch, expectedStatus: MatchStatus, ...or: MatchStatus[]) => {
    if (match.status !== expectedStatus && or.filter(x => x === match.status).length == 0) {
      throw new Error(`Match status error, expected: ${MatchStatus[expectedStatus]}${or ? ' or ' + or.map(x => MatchStatus[x]).join('or ') : ''} actual: ${MatchStatus[match.status]}`)
    }
  }

  const matches = async (): Promise<MatchesResult> => {
    const currentHeight = await api.getHeight()

    const matchScripts = await api.getSetScriptTxsByScript(compiledScript).then(s => s.map(x => ({ ...x, timestamp: Date.parse(x.timestamp.toString()) })).toRecord(x => x.sender))

    if (Object.keys(matchScripts).length == 0) {
      return {
        currentHeight,
        matches: {},
      }
    }

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

    return {
      currentHeight,
      matches: Object.keys(matchScripts).map(a => {
        if (!p1Inits[a])
          return undefined

        const match: IMatch = {
          address: a,
          publicKey: matchScripts[a].senderPublicKey,
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

        match.status = computeMatchStatus(match, currentHeight)

        // Already finished matches
        if (payouts[a]) {
          match.status = MatchStatus.Done
        }

        if (match.status >= MatchStatus.WaitingForDeclare) {
          match.result = whoHasWon(match.creator.moves, match.opponent.moves)
        }

        return match
      })
        .filter(x => x !== undefined)
        .toRecord(x => x.address),
    }
  }

  return {
    matches,

    match: async (address: string): Promise<IMatch> => {
      return EmptyMatch
      // const m = (await matches()).filter(m => m.address == address)
      // if (m.length == 1)
      //   return m[0]
      // else throw new Error('Match not found')
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
        match: {
          publicKey: matchKey,
          address: matchAddress,
          timestamp: s.timestamp,
          creator: {
            address: address({ public: player1Key }, config.chainId),
            publicKey: player1Key,
          },
        },
      }
    },

    join: async (match: IMatch, hands: number[], progress: MatchProgress = () => { }): Promise<{ match: IMatch, error: any }> => {
      ensureStatus(match, MatchStatus.WaitingForP2)

      progress(0)
      const { setKeysAndValues } = apiHelpers(api)
      const matchKey = match.publicKey
      const matchAddress = address({ public: matchKey }, config.chainId)

      //#STEP4# P2 => bet
      const p2p = await keeper.prepareWavesTransfer(matchAddress, gameBet)
      progress(.15)

      const utx = await api.getUtx()
      const utxTransfers = utx.filter(x => x.type === TRANSACTION_TYPE.TRANSFER).map(x => x as ITransferTransaction)
        .filter(x => x.recipient === match.address)
      if (utxTransfers.length > 0) {

        const p2k = utxTransfers[0].senderPublicKey

        const m = {
          ...match,
          opponent: {
            address: address({ public: p2k }, config.chainId),
            publicKey: p2k,
          },
        }

        return { match: m, error: { code: 1 } }
      }

      const transfers = (await api.getTransfers({ recipient: match.address }))
        .filter(x => x.senderPublicKey != match.creator.publicKey)
      if (transfers.length > 0) {

        const p2k = transfers[0].senderPublicKey

        const m = {
          ...match,
          opponent: {
            address: address({ public: p2k }, config.chainId),
            publicKey: p2k,
          },
        }

        return { match: m, error: { code: 1 } }
      }

      progress(.3)

      const { id: p2PaymentId, senderPublicKey: player2Key } = await api.broadcastAndWait(p2p)
      const { move, moveHash } = hideMoves(hands)

      match.payments = match.payments || []
      match.payments.push(p2PaymentId)

      progress(.5)
      //#STEP5# P2 => move
      let h
      try {
        const x = await retry(async () => {
          const h = await api.getHeight()
          const tx = setKeysAndValues({ publicKey: matchKey }, { 'p2k': from58(player2Key), 'p2mh': moveHash, 'h': h, 'p2p': from58(p2PaymentId) })
          return { h, tx }
        }, 5, 3000)
        h = x.h
      } catch (error) {
        progress(1)
        const m = {
          ...match,
        }

        return { match: m, error }
      }
      progress(.8)
      //#STEP6# P2 => reveal
      await retry(() => setKeysAndValues({ publicKey: matchKey }, { 'p2m': move }), 10, 2000)

      progress(1)

      //update match

      const m = {
        ...match,
        reservationHeight: h,
        opponent: {
          publicKey: player2Key,
          address: address({ public: player2Key }, config.chainId),
          moves: [move[0], move[1], move[2]] as [HandSign, HandSign, HandSign],
        },
      }

      return { match: m, error: undefined }
    },

    reveal: async (match: IMatch, move: Uint8Array): Promise<IMatch> => {
      ensureStatus(match, MatchStatus.WaitingToReveal)

      //#STEP7# P1 => reveal
      await setKeysAndValues({ publicKey: match.publicKey }, { 'p1m': move })

      //update match
      match.creator.moves = [move[0], move[1], move[2]] as [HandSign, HandSign, HandSign]

      return match
    },

    declareCashback: async (match: IMatch, paymentId: string): Promise<{ match: IMatch, cashback: ITransferTransaction }> => {
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

    declarePayout: async (match: IMatch): Promise<{ match: IMatch, payout: IMassTransferTransaction }> => {
      ensureStatus(match, MatchStatus.WaitingForDeclare)

      const w = match.result == MatchResult.Draw ? '1' : match.result == MatchResult.Creator ? match.creator.publicKey : match.opponent.publicKey
      //#STEP8# Winner => declare
      //await setKeysAndValues({ publicKey: match.publicKey }, { 'w': from58(w), })

      const winner = match.result == MatchResult.Opponent ? match.opponent!.address : match.creator.address
      const looser = match.result == MatchResult.Opponent ? match.creator.address : match.opponent!.address

      const matchBalance = (await api.getBalance(match.address)) - serviceCommission - 700000 - 500000
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

      return { match: { ...match, winner: w, status: MatchStatus.WaitingForPayout }, payout }
    },

    payout: async (match: IMatch, payout: IMassTransferTransaction): Promise<IMatch> => {
      ensureStatus(match, MatchStatus.WaitingForPayout)

      if (!match.reservationHeight)
        throw new Error('There is no reservation height on match')

      if (!match.opponent)
        throw new Error('Match opponent is empty')


      //#STEP9# payout
      await api.broadcastAndWait(payout)

      return { ...match, status: MatchStatus.Done }
    },
  }
}
