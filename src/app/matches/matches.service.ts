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
import { IMatch, MatchStatus, PlayerMoves, HandSign, EmptyMatch } from './shared/match.interface'

const wave = 100000000

@Injectable({
  providedIn: 'root'
})
export class MatchesService {

  private matches: Record<string, IMatch> = {}

  constructor(private keeper: KeeperService, private core: CoreService, private http: HttpClient) { }

  hideMoves(moves: number[]) {
    const salt = randomBytes(29)
    const move = concat([moves[0], moves[1], moves[2]], salt)
    const moveHash = sha256(move)

    return { salt, moveHash, move }
  }

  async getMatchList(): Promise<IMatch[]> {

    interface DataTxEntry {
      key: string
      type: string
      value: string
    }

    interface DataTx {
      data: {
        type: 12,
        height: number,
        id: 'AvJPztkpVwRhucjz9WsdToEikqrv3sKbBHSgyaMXkL76',
        timestamp: string,
        proofs: string[],
        sender: string,
        senderPublicKey: string,
        fee: number,
        data: DataTxEntry[]
      }
    }

    interface DataTxResponse {
      data: DataTx[]
    }

    const getDataTransactionsByKey = async (key: string): Promise<DataTx[]> => {
      const response = await this.http.get<DataTxResponse>(environment.api.txEnpoint + `transactions/data?key=${key}&sort=desc&limit=100`).toPromise()
      return response.data
    }

    const r = await getDataTransactionsByKey('matchKey')

    const getDataByKey = (key: string, resp: DataTx[]) => {
      const found = resp.map(x => x.data.data.filter(y => y.key === key)).filter(x => x.length > 0)
      return found.length === 1 ? found[0][0].value : undefined
    }

    const getValueByKey = (key: string, dataTx: DataTx) => {
      const found = dataTx.data.data.filter(d => d.key === key)
      return found.length === 1 ? found[0].value : undefined
    }

    const matches: Record<string, IMatch> = r.reduce((a, b) => {
      const p1Key = getDataByKey('player1Key', [b])
      if (!p1Key) {
        return a
      }
      const creatorPk = base58encode(BASE64_STRING(p1Key.slice(7)))
      const creatorAddress = address({ public: creatorPk })
      return ({
        ...a, [b.data.sender]: {
          address: b.data.sender,
          publicKey: b.data.senderPublicKey,
          creator: {
            address: creatorAddress,
            publicKey: creatorPk
          },
          status: MatchStatus.New
        }
      })
    }, {})

    const _ = (await getDataTransactionsByKey('p2MoveHash'))
      .forEach(p => {
        const p2Key = getValueByKey('player2Key', p)
        const pk = base58encode(BASE64_STRING(p2Key.slice(7)))
        const addr = address({ public: pk })

        const match = matches[p.data.sender]
        if (match) {
          match.opponent = {
            publicKey: pk,
            address: addr
          }
        }
      })

    const p2Moves = (await getDataTransactionsByKey('p2Move'))
      .map(p => ({ match: p.data.sender, move: getValueByKey('p2Move', p) }))


    const p1Moves = (await getDataTransactionsByKey('p1Move'))
      .map(p => ({ match: p.data.sender, move: getValueByKey('p1Move', p) }))

    p2Moves.forEach(m => {
      if (matches[m.match]) {
        const moves = BASE64_STRING(m.move.slice(7)).slice(0, 3)
        matches[m.match].opponent.moves = [moves[0], moves[1], moves[2]]
        matches[m.match].status = MatchStatus.Waiting
      }
    })

    p1Moves.forEach(m => {
      if (matches[m.match]) {
        const moves = BASE64_STRING(m.move.slice(7)).slice(0, 3)
        matches[m.match].creator.moves = [moves[0], moves[1], moves[2]]
        matches[m.match].status = MatchStatus.Done
      }
    })

    return Object.values(matches)
  }

  async createMatch(moves: HandSign[]): Promise<IMatch> {

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
      address: addr, publicKey: pk, moveHash, move, status: MatchStatus.New, creator: {
        address: player1Address,
        publicKey: player1Key,
        moves: moves as PlayerMoves
      }
    }
  }

  async joinGame(matchPublicKey: string, matchAddress: string, playerSeed: string, moves: number[]) {

    const playerPublicKey = publicKey(playerSeed)
    const h = (await this.http.get<{ height: number }>(environment.api.baseEndpoint + 'blocks/last').toPromise()).height
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
      console.log(JSON.stringify(error.response.data))
    }

    console.log(`Player 2 move completed`)

    const p2Transfer = await this.keeper.prepareWavesTransfer(matchAddress, 1 * wave)

    const { id } = await this.core.broadcastAndWait(p2Transfer)

    const tmp2 = data({
      senderPublicKey: matchPublicKey, data: [
        { key: 'p2Move', value: move },
        { key: 'payment', value: base58decode(id) }
      ], fee: 500000
    }, playerSeed)

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

    const compare = (m1: number, m2: number) =>
      ((m1 === 0 && m2 === 2) ||
        (m1 === 1 && m2 === 0) ||
        (m1 === 2 && m2 === 1)) ? 1 : (m1 === m2 ? 0 : -1)

    const score = player2Move.slice(0, 3).reduce((s, p2, i) => s + compare(move[i], p2), 0)

    const left = 197400000
    const commission = 1 * wave / 200
    let payout
    if (score === 0) {
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
      const winner = score > 0 ? player1Address : player2Address
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
