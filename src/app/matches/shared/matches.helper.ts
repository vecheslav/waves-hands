import { Injectable } from '@angular/core'
import { concat, publicKey, sha256, base58decode, BASE64_STRING, address, base58encode } from 'waves-crypto'
import { environment } from '../../../environments/environment'
import { data, setScript, massTransfer } from 'waves-transactions'
import { KeeperService } from '../../auth/keeper.service'
import { CoreService } from '../../core/core.service'
import { HttpClient } from '@angular/common/http'
import { compiledScript } from './contract'
import { randomAccount } from './util'
import { IMatch, MatchStatus, PlayerMoves, HandSign, MatchResult, IPlayer } from './match.interface'
import { TRANSACTION_TYPE, IDataTransaction, IMassTransferTransaction } from 'waves-transactions/transactions'
import { api, apiConfig, IWavesApi } from './api'
import { fromAngular } from './api-angular'
import './extensions'
import { ErrorCode } from 'src/app/shared/error-code'
import { randomBytes } from 'crypto'

const wave = 100000000
const uint8Arr = Uint8Array.from([])

const getString = (key: string, dataTx: IDataTransaction): string => {
  const found = dataTx.data.find(x => x.key === key)
  if (found) {
    return found.value.toString()
  }
}

const getNumber = (key: string, dataTx: IDataTransaction): number => {
  const found = dataTx.data.find(x => x.key === key)
  if (found) {
    return parseInt(found.value.toString(), undefined)
  }
}

const getBinary = (key: string, dataTx: IDataTransaction): Uint8Array => {
  const found = dataTx.data.find(x => x.key === key)
  if (found) {
    return BASE64_STRING(found.value.toString().slice(7))
  }
}

const getBinaryStruct = <T>(struct: T, dataTxs: IDataTransaction[]): T =>
  Object.keys(struct).map(k => ({ key: k, value: getBinaries(k, dataTxs).firstOrUndefined() })).reduce((a, b) => ({
    ...a,
    [b.key]: b.value
  }), {}) as T

const getBinaries = (key: string, dataTxs: IDataTransaction[]): Array<Uint8Array> =>
  dataTxs.map(x => x.data.filter(d => d.key === key))
    .filter(x => x.length > 0)
    .reduce((a, b) => [...a, ...b], [])
    .map(x => BASE64_STRING(x.value.toString().slice(7)))

const getNumbers = (key: string, dataTxs: IDataTransaction[]): Array<number> =>
  dataTxs.map(x => getNumber(key, x))
    .filter(x => x !== undefined)

const getDataByKey = <T>(key: string, resp: IDataTransaction[], map?: (data: string) => T) => {
  const found = resp.map(x => x.data.filter(y => y.key === key)).filter(x => x.length > 0)
  return found.length === 1 ? (map ? map(found[0][0].value.toString()) : found[0][0].value.toString()) : undefined
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

@Injectable()
export class MatchesHelper {
  private _api: IWavesApi

  constructor(private keeper: KeeperService, private core: CoreService, private http: HttpClient) {
    this._api = api(apiConfig, fromAngular(http))
  }

  toMoves(uint8Array: Uint8Array): PlayerMoves {
    if (!uint8Array || uint8Array.length < 3 && uint8Array.slice(0.3).every(x => x >= 0 && x <= 2)) {
      throw new Error('Invalid Uint8Array')
    }

    return [uint8Array[0], uint8Array[1], uint8Array[2]] as PlayerMoves
  }

  hideMoves(moves: number[]) {
    const salt = randomBytes(29)

    const move = concat([moves[0], moves[1], moves[2]], salt)
    const moveHash = sha256(move)

    return { salt, moveHash, move }
  }

  async getMatch(addr: string): Promise<IMatch> {

    const r = await this._api.getTxsByAddress(addr)

    const massTransfers = r.filter(x => x.type === TRANSACTION_TYPE.MASS_TRANSFER) as IMassTransferTransaction[]

    const filteredTxs = r.filter(x => x.type === TRANSACTION_TYPE.DATA) as IDataTransaction[]

    const h = getNumbers('height', filteredTxs).firstOrUndefined()

    const {
      p2MoveHash,
      p2Move,
      p1Move,
      player1Key,
      player2Key,
      matchKey,
    } = getBinaryStruct({
      p2MoveHash: uint8Arr,
      p2Move: uint8Arr,
      p1Move: uint8Arr,
      player1Key: uint8Arr,
      player2Key: uint8Arr,
      matchKey: uint8Arr,
    }, filteredTxs)

    if (!player1Key || !matchKey) {
      return undefined
    }

    let status = MatchStatus.New

    const p1Key = base58encode(player1Key)

    const creator: IPlayer = player1Key ? {
      address: address({ public: p1Key }, environment.chainId),
      publicKey: p1Key,
    } : undefined

    let opponent
    if (p2MoveHash) {
      const p2Key = base58encode(player2Key)
      opponent = {
        address: address({ public: p2Key }, environment.chainId),
        publicKey: p2Key,
      }
    }

    if (p2Move && p2Move.length > 0) {
      status = MatchStatus.Waiting
      opponent.moves = this.toMoves(p2Move)
    }

    if (p1Move && p1Move.length > 0) {
      creator.moves = this.toMoves(p1Move)
      status = MatchStatus.Done
    }

    const result = (opponent && opponent.moves) ? whoHasWon(creator.moves, opponent.moves) : undefined

    const match = {
      address: addr,
      creator,
      opponent,
      status,
      result,
      publicKey: base58encode(matchKey),
      timestamp: filteredTxs.min(x => x.timestamp).timestamp,
      reservationHeight: h
    }

    if (massTransfers.length === 1) {
      const p = massTransfers[0]
      const winner = p.transfers.find(x => x.amount > 1 * wave)
      if (winner) {
        if (match.creator.address === winner.recipient) {
          match.result = MatchResult.Creator
        } else {
          match.result = MatchResult.Opponent
        }
      } else {
        match.result = MatchResult.Draw
      }
      match.status = MatchStatus.Done
    }

    return match
  }

  async getMatchList(): Promise<{ matches: Record<string, IMatch>, currentHeight: number }> {
    const r = await this._api.getDataTxsByKey('matchKey')

    const payouts = await this._api.getMassTransfersByRecipient(environment.serviceAddress)
    const scripts = await this._api.getSetScriptTxsByScript('base64:' + compiledScript)
    const s = scripts.reduce((a, b) => ({ ...a, [b.sender]: true }), {})
    const currentHeight = await this._api.getHeight()

    const matches: Record<string, IMatch> = r.reduce((a, b) => {
      const p1Key = getDataByKey('player1Key', [b], x => base58encode(BASE64_STRING(x.slice(7))))
      if (!p1Key) {
        return a
      }
      if (!s[b.sender]) {
        return a
      }
      const creatorAddress = address({ public: p1Key }, environment.chainId)
      return ({
        ...a, [b.sender]: {
          address: b.sender,
          publicKey: b.senderPublicKey,
          creator: {
            address: creatorAddress,
            publicKey: p1Key
          },
          timestamp: b.timestamp,
          status: MatchStatus.New
        }
      })
    }, {})



    payouts.forEach(p => {
      const m = matches[p.sender]
      if (m) {
        const winner = p.transfers.find(x => x.amount > 1)
        if (winner) {
          if (m.creator.address === winner.recipient) {
            m.result = MatchResult.Creator
          } else {
            m.result = MatchResult.Opponent
          }
        } else {
          m.result = MatchResult.Draw
        }
        m.status = MatchStatus.Done
      }
    })

    const _ = (await this._api.getDataTxsByKey('p2MoveHash'))
      .forEach(p => {
        const p2Key = base58encode(getBinary('player2Key', p))
        const h = getNumber('height', p)

        const addr = address({ public: p2Key }, environment.chainId)

        const match = matches[p.sender]
        if (match) {
          match.reservationHeight = h
          match.opponent = {
            publicKey: p2Key,
            address: addr
          }

        }
      })

    const p2Moves = (await this._api.getDataTxsByKey('p2Move'))
      .map(p => ({ match: p.sender, move: getBinary('p2Move', p).slice(0, 3) }))

    const p1Moves = (await this._api.getDataTxsByKey('p1Move'))
      .map(p => ({ match: p.sender, move: getBinary('p1Move', p).slice(0, 3) }))

    p2Moves.forEach(m => {
      const match = matches[m.match]
      if (match) {
        const moves = m.move

        if (match.opponent) {
          match.opponent.moves = [moves[0], moves[1], moves[2]]
        }

        if (match.status === MatchStatus.New) {
          match.status = MatchStatus.Waiting
        }
      }
    })

    p1Moves.forEach(m => {
      const match = matches[m.match]
      if (match) {
        const moves = m.move
        match.creator.moves = [moves[0], moves[1], moves[2]]
        // match.status = MatchStatus.Done

        if (match.opponent) {
          match.result = whoHasWon(match.creator.moves, match.opponent.moves)
        }
      }
    })

    Object.values(matches).filter(m => m.reservationHeight - currentHeight < -3 && m.status === MatchStatus.New).forEach(m => {
      matches[m.address].reservationHeight = undefined
      matches[m.address].opponent = undefined
    })

    return { matches, currentHeight }
  }

  async createMatch(moves: HandSign[], progress: (zeroToOne: number) => void = () => { }): Promise<{ move: Uint8Array, moveHash: Uint8Array, match: IMatch }> {
    progress(0)

    const { seed, address: addr, publicKey: pk } = randomAccount()

    const p1Transfer = await this.keeper.prepareWavesTransfer(addr, 1 * wave)

    const { account } = await this.keeper.keeper.publicState()
    if (!account || account.balance.available < environment.gameBetAmount + environment.defaultFee) {
      throw { ... new Error('You have not enough balance to play!'), code: ErrorCode.NotEnoughBalance }
    }


    const player1Key = p1Transfer.senderPublicKey
    const player1Address = address({ public: player1Key }, environment.chainId)

    progress(0.15)

    const { moveHash, move } = this.hideMoves(moves)

    await this.core.broadcastAndWait(p1Transfer)

    progress(0.5)

    console.log(`Player 1 transfer completed`)

    const p1DataTx = data({
      data: [
        { key: 'p1MoveHash', value: moveHash },
        { key: 'matchKey', value: base58decode(pk) },
        { key: 'player1Key', value: base58decode(player1Key) }
      ]
    }, seed)

    const r = await this.core.broadcastAndWait(p1DataTx)

    progress(0.8)

    console.log(`Player 1 move completed`)

    await this.core.broadcastAndWait(prepareSetScriptTx(seed, environment.chainId))

    progress(1)

    console.log(`Match script set, address: ${addr}`)
    console.log(`Public Key: ${publicKey}`)

    return {
      move,
      moveHash,
      match: {
        address: addr, publicKey: pk, status: MatchStatus.New, creator: {
          address: player1Address,
          publicKey: player1Key,
          moves: moves as PlayerMoves
        },
        timestamp: r.timestamp
      }
    }
  }

  async joinMatch(matchPublicKey: string,
    matchAddress: string,
    moves: number[],
    progress: (zeroToOne: number) => void = () => { }) {
    progress(0)
    const { moveHash, move } = this.hideMoves(moves)

    const p2Transfer = await this.keeper.prepareWavesTransfer(matchAddress, 1 * wave, new TextDecoder('utf-8')
      .decode(move))

    const { account } = await this.keeper.keeper.publicState()
    if (!account || account.balance.available < environment.gameBetAmount + environment.defaultFee) {
      throw { ... new Error('You have not enough balance to play!'), code: ErrorCode.NotEnoughBalance }
    }

    progress(0.15)
    const h = await this._api.getHeight()
    console.log(`Height is ${h}`)

    progress(0.30)

    const dataTx = data({
      senderPublicKey: matchPublicKey, data: [
        { key: 'height', value: h },
        { key: 'p2MoveHash', value: moveHash },
        { key: 'player2Key', value: base58decode(p2Transfer.senderPublicKey) }
      ], fee: 500000
    })

    await this.core.broadcastAndWait(dataTx)

    progress(0.5)

    console.log(`Player 2 move completed`)

    console.log(p2Transfer)
    console.log(p2Transfer.attachment)

    const { id } = await this._api.broadcastAndWait(p2Transfer)
    progress(0.8)

    const revealP2Move = data({
      senderPublicKey: matchPublicKey, data: [
        { key: 'p2Move', value: move },
        { key: 'payment', value: base58decode(id) }
      ], fee: 500000
    })

    await this.core.broadcastAndWait(revealP2Move)

    progress(1)

    console.log(`Player 2 move revealed`)
  }

  async payout(match: IMatch, move?: Uint8Array) {

    // const player2Move = await (this.http.get<{ value: string }>(`${environment.api.baseEndpoint}addresses/data/${match.address}/p2Move`))
    //   .toPromise().then(x => BASE64_STRING(x.value.slice(7)))

    const result = whoHasWon(Array.from(move || match.creator.moves), Array.from(match.opponent.moves))
    const balance = await this._api.getBalance(match.address)
    const commission = 1 * wave / 200
    let payout

    if (result === MatchResult.Draw) {
      const fee = 700000
      payout = massTransfer({
        transfers: [
          { amount: commission, recipient: environment.serviceAddress },
          { amount: (balance - fee - commission) / 2, recipient: match.creator.address },
          { amount: (balance - fee - commission) / 2, recipient: match.opponent.address },
        ],
        senderPublicKey: match.publicKey,
        fee: fee
      })
    } else {
      const fee = 600000
      const winner = result === MatchResult.Creator ? match.creator.address : match.opponent.address
      payout = massTransfer({
        transfers: [
          { amount: commission, recipient: environment.serviceAddress },
          { amount: (balance - fee - commission), recipient: winner },
        ],
        senderPublicKey: match.publicKey,
        fee: fee
      })

      console.log('Winner: ' + winner)
    }

    try {
      await this.core.broadcastAndWait(payout)
    } catch (err) {
      throw err
    }

  }

  async forceFinish(match: IMatch) {
    const fee = 600000
    const winner = match.opponent.address
    const commission = 1 * wave / 200

    const balance = await this._api.getBalance(match.address)

    const payout = massTransfer({
      transfers: [
        { amount: commission, recipient: environment.serviceAddress },
        { amount: (balance - fee - commission), recipient: winner },
      ],
      senderPublicKey: match.publicKey,
      fee: fee
    })

    try {
      return await this.core.broadcastAndWait(payout)
    } catch (err) {
      throw err
    }

  }

  async finishMatch(match: IMatch, move: Uint8Array) {
    console.log('Revealing p1 move:')
    console.log(move)

    const revealP1 = data({
      senderPublicKey: match.publicKey,
      data: [
        { key: 'p1Move', value: move },
      ],
      fee: 500000
    })

    try {
      await this.core.broadcastAndWait(revealP1)
    } catch (err) {
      throw err
    }

    this.payout(match, move)

    console.log('Payout completed')
  }
}

export const prepareSetScriptTx = (matchSeed: string, chainId: string) => {
  const tx = setScript({ script: compiledScript, chainId }, matchSeed)
  return tx
}
