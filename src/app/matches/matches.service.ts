import { Injectable } from '@angular/core'
import { randomBytes } from 'crypto'
import { concat, publicKey, sha256, base58decode, BASE64_STRING, address, base58encode } from 'waves-crypto'
import { environment } from '../../environments/environment'
import { data, setScript, massTransfer } from 'waves-transactions'
import { KeeperService } from '../auth/keeper.service'
import { CoreService } from '../core/core.service'
import { HttpClient } from '@angular/common/http'
import { compiledScript } from './shared/contract'
import { randomAccount } from './shared/util'
import { IMatch, MatchStatus, PlayerMoves, HandSign, MatchResult } from './shared/match.interface'
import { TTx, TRANSACTION_TYPE, IDataTransaction } from 'waves-transactions/transactions'
import { api, testnetConfig, IWavesApi } from './shared/api'
import { fromAngular } from './shared/api-angular'

const wave = 100000000

declare global {
  interface Array<T> {
    firstOrUndefined(): T
  }
}

Array.prototype.firstOrUndefined = function () {
  return this.length > 0 ? this[0] : undefined
}

const getString = (key: string, dataTx: IDataTransaction): string => {
  const found = dataTx.data.find(x => x.key === key)
  if (found) {
    return found.value.toString()
  }
}

const getBinary = (key: string, dataTx: IDataTransaction): Uint8Array => {
  const found = dataTx.data.find(x => x.key === key)
  if (found) {
    return BASE64_STRING(found.value.toString().slice(7))
  }
}

const getBinaries = (key: string, dataTxs: IDataTransaction[]): Array<Uint8Array> =>
  dataTxs.map(x => x.data.filter(d => d.key === key))
    .filter(x => x.length > 0)
    .reduce((a, b) => [...a, ...b], [])
    .map(x => BASE64_STRING(x.value.toString().slice(7)))

const getDataByKey = <T>(key: string, resp: IDataTransaction[], map?: (data: string) => T) => {
  const found = resp.map(x => x.data.filter(y => y.key === key)).filter(x => x.length > 0)
  return found.length === 1 ? (map ? map(found[0][0].value.toString()) : found[0][0].value.toString()) : undefined
}

const compareMoves = (m1: number, m2: number) =>
  ((m1 === 0 && m2 === 2) ||
    (m1 === 1 && m2 === 0) ||
    (m1 === 2 && m2 === 1)) ? 1 : (m1 === m2 ? 0 : -1)

const whoHasWon = (p1: number[], p2: number[]) => {
  const score = p2.slice(0, 3).reduce((s, p2move, i) => s + compareMoves(p1[i], p2move), 0)
  return score > 0 ? MatchResult.Creator : (score === 0 ? MatchResult.Draw : MatchResult.Opponent)
}

@Injectable({
  providedIn: 'root'
})
export class MatchesService {

  private matches: Record<string, IMatch> = {}
  private api: IWavesApi

  constructor(private keeper: KeeperService, private core: CoreService, private http: HttpClient) {
    this.api = api(testnetConfig, fromAngular(http))
  }

  hideMoves(moves: number[]) {
    const salt = randomBytes(29)
    const move = concat([moves[0], moves[1], moves[2]], salt)
    const moveHash = sha256(move)

    return { salt, moveHash, move }
  }

  async getMatch(addr: string): Promise<IMatch> {

    const r = await this.api.getTxsByAddress(addr)

    const d = r.filter(x => x.type === TRANSACTION_TYPE.DATA) as IDataTransaction[]

    const p2MoveHash = getBinaries('p2MoveHash', d).firstOrUndefined()
    const p2Move = getBinaries('p2Move', d).firstOrUndefined()
    const p1Move = getBinaries('p1Move', d).firstOrUndefined()
    const player1Key = getBinaries('player1Key', d).map(x => base58encode(x)).firstOrUndefined()
    const player2Key = getBinaries('player2Key', d).map(x => base58encode(x)).firstOrUndefined()
    const matchKey = getBinaries('matchKey', d).map(x => base58encode(x)).firstOrUndefined()

    if (!player1Key || !matchKey) {
      return undefined
    }

    let status = MatchStatus.New
    let opponent
    let creator

    if (player1Key) {
      creator = {
        address: address({ public: player1Key }, environment.chainId),
        publicKey: player1Key,
      }
    }

    if (p2MoveHash) {
      opponent = {
        address: address({ public: player2Key }, environment.chainId),
        publicKey: player2Key,
      }
    }

    if (p2Move) {
      status = MatchStatus.Waiting
      opponent.move = p2Move
    }

    if (p1Move) {
      creator.move = p1Move
      status = MatchStatus.Done
    }

    return {
      address: addr,
      creator,
      opponent,
      status,
      publicKey: matchKey,
    }
  }

  async getMatchList(): Promise<IMatch[]> {
    const r = await this.api.getDataTxsByKey('matchKey')

    const matches: Record<string, IMatch> = r.reduce((a, b) => {
      const p1Key = getDataByKey('player1Key', [b], x => base58encode(BASE64_STRING(x.slice(7))))
      if (!p1Key) {
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
          status: MatchStatus.New
        }
      })
    }, {})



    const _ = (await this.api.getDataTxsByKey('p2MoveHash'))
      .forEach(p => {
        const p2Key = base58encode(getBinary('player2Key', p))
        const addr = address({ public: p2Key }, environment.chainId)

        const match = matches[p.sender]
        if (match) {
          match.opponent = {
            publicKey: p2Key,
            address: addr
          }
        }
      })

    const p2Moves = (await this.api.getDataTxsByKey('p2Move'))
      .map(p => ({ match: p.sender, move: getBinary('p2Move', p).slice(0, 3) }))

    const p1Moves = (await this.api.getDataTxsByKey('p1Move'))
      .map(p => ({ match: p.sender, move: getBinary('p1Move', p).slice(0, 3) }))

    p2Moves.forEach(m => {
      if (matches[m.match]) {
        const moves = m.move
        matches[m.match].opponent.moves = [moves[0], moves[1], moves[2]]
        matches[m.match].status = MatchStatus.Waiting
      }
    })

    p1Moves.forEach(m => {
      const match = matches[m.match]
      if (match) {
        const moves = m.move
        match.creator.moves = [moves[0], moves[1], moves[2]]
        match.status = MatchStatus.Done
        match.result = whoHasWon(match.creator.moves, match.opponent.moves)
      }
    })

    return Object.values(matches)
  }

  async createMatch(moves: HandSign[]): Promise<{ move: Uint8Array, moveHash: Uint8Array, match: IMatch }> {

    const { seed, address: addr, publicKey: pk } = randomAccount()

    const p1Transfer = await this.keeper.prepareWavesTransfer(addr, 1 * wave)
    const player1Key = p1Transfer.senderPublicKey
    const player1Address = address({ public: player1Key }, environment.chainId)

    const { moveHash, move } = this.hideMoves(moves)

    await this.core.broadcastAndWait(p1Transfer)

    console.log(`Player 1 transfer completed`)

    const p1DataTx = data({
      data: [
        {
          key: 'p1MoveHash', value: moveHash
        },
        {
          key: 'matchKey', value: base58decode(pk)
        },
        {
          key: 'player1Key', value: base58decode(player1Key)
        }
      ]
    }, seed)

    await this.core.broadcastAndWait(p1DataTx)

    console.log(`Player 1 move completed`)

    const setScriptTx = prepareSetScriptTx(
      seed,
      environment.chainId
    )

    await this.core.broadcastAndWait(setScriptTx)

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
        }
      }
    }
  }

  async joinGame(matchPublicKey: string, matchAddress: string, playerPublicKey: string, moves: number[]) {

    const h = await this.api.getHeight()
    console.log(`Height is ${h}`)

    const { moveHash, move } = this.hideMoves(moves)

    const tmp = data({
      senderPublicKey: matchPublicKey, data: [
        { key: 'height', value: h },
        { key: 'p2MoveHash', value: moveHash },
        { key: 'player2Key', value: base58decode(playerPublicKey) }
      ], fee: 500000
    })

    const dataTx = await this.keeper.prepareDataTx(tmp.data, tmp.senderPublicKey, parseInt(tmp.fee.toString(), undefined))

    try {
      await this.core.broadcastAndWait(dataTx)
    } catch (error) {
      console.error(error)
      // console.log(JSON.stringify(error.response.data))
    }

    console.log(`Player 2 move completed`)

    const p2Transfer = await this.keeper.prepareWavesTransfer(matchAddress, 1 * wave)

    const { id } = await this.core.broadcastAndWait(p2Transfer)

    const tmp2 = data({
      senderPublicKey: matchPublicKey, data: [
        { key: 'p2Move', value: move },
        { key: 'payment', value: base58decode(id) }
      ], fee: 500000
    })

    const revealP2Move = await this.keeper.prepareDataTx(tmp2.data, tmp2.senderPublicKey, parseInt(tmp2.fee.toString(), undefined))

    try {
      await this.core.broadcastAndWait(revealP2Move)
    } catch (error) {
      console.log(JSON.stringify(error.response.data))
    }

    console.log(`Player 2 move revealed`)
  }

  async finishGame(player1Address: string, player2Address: string, matchPublicKey: string, matchAddress: string, move: Uint8Array) {
    const revealP1 = data({
      data: [
        { key: 'p1Move', value: move },
      ],
      fee: 500000,
      senderPublicKey: matchPublicKey
    })

    try {
      await this.core.broadcastAndWait(revealP1)
    } catch (error) {
      console.log(JSON.stringify(error.response.data))
    }

    const player2Move = await (this.http.get<{ value: string }>(`${environment.api.baseEndpoint}addresses/data/${matchAddress}/p2Move`))
      .toPromise().then(x => BASE64_STRING(x.value.slice(7)))

    const result = whoHasWon(Array.from(move), Array.from(player2Move))

    const left = 197400000
    const commission = 1 * wave / 200
    let payout
    if (result === MatchResult.Draw) {
      const fee = 300000 + 400000
      payout = massTransfer({
        transfers: [
          { amount: commission, recipient: environment.serviceAddress },
          { amount: (left - fee - commission) / 2, recipient: player1Address },
          { amount: (left - fee - commission) / 2, recipient: player2Address },
        ],
        senderPublicKey: matchPublicKey,
        fee: fee
      })
    } else {
      const fee = 200000 + 400000
      const winner = result === MatchResult.Creator ? player1Address : player2Address
      payout = massTransfer({
        transfers: [
          { amount: commission, recipient: environment.serviceAddress },
          { amount: (left - fee - commission), recipient: winner },
        ],
        senderPublicKey: matchPublicKey,
        fee: fee
      })

      console.log('Winner: ' + winner)
    }

    try {
      await this.core.broadcastAndWait(payout)
    } catch (error) {
      console.log(JSON.stringify(error.response.data))
    }

    console.log('Payout completed')
  }
}

export const prepareSetScriptTx = (matchSeed: string, chainId: string) => {
  const tx = setScript({ script: compiledScript, chainId }, matchSeed)
  return tx
}
