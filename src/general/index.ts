
import { TTx as Tx } from 'waves-transactions/transactions'
import { data, setScript } from 'waves-transactions'
import { address, concat, base58encode } from 'waves-crypto'
import axios from 'axios'
import { randomBytes } from 'crypto'
import { keeper } from './keeper'
import { gameBetAmount } from './globals'

// const baseUri = 'https://nodes.wavesnodes.com/'
const baseUri = 'https://testnodes.wavesnodes.com/'
const chainId = 'T'
const defaultTimeout = 1000 * 60 * 1

export enum GameMove {
  Rock = 0,
  Paper = 1,
  Scissors = 2,
}

export interface IGameInfo {
  addrass: string
  timestamp: number
  salt?: string
}

export type GameMoves = [GameMove, GameMove, GameMove]

type CancellablePromise = Promise<{}> & { cancel: () => void }

export const delay = (timeout: number): CancellablePromise => {
  const t: any = {}
  const p = new Promise((resolve, _) => {
    t.resolve = resolve
    t.id = setTimeout(() => resolve(), timeout)
  }) as any
  (<any>p).cancel = () => { t.resolve(); clearTimeout(t.id) }
  return p
}

export const waitForTx = async (txId: string, timeout: number): Promise<Tx> => {
  const promise = () => axios.get(`transactions/info/${txId}`, { baseURL: baseUri })
    .catch(_ => delay(1000)
      .then(__ => promise()))
  const t = delay(timeout)
  const r = await Promise.race([t.then(x => Promise.reject('timeout')), promise().then(x => x.data as Tx)]) as Tx
  t.cancel()
  return r
}

export const broadcast = async (tx: Tx) =>
  await axios.post(baseUri + 'transactions/broadcast', tx)
    .then(x => x.data)

export const broadcastAndWait = async (tx: Tx, timeout: number = 1000 * 60 * 2) => {
  const r = await broadcast(tx)
  console.log(r)
  return await waitForTx(r.id, timeout)
}

export const createNewGame = async (moves: GameMoves): Promise<IGameInfo> => {
  const gameSeed = randomBytes(32).toString('hex')
  const gameSalt = randomBytes(31)
  const gameAddress = address(gameSeed, chainId)
  const tx = await keeper.transferWaves(gameAddress, gameBetAmount)
  await waitForTx(tx.id, defaultTimeout)

  const dataTx = data({
    data: moves.map((m, i) => ({ key: `m1${i + 1}`, value: concat([m], gameSalt) }))
  })

  await broadcastAndWait(dataTx, defaultTimeout)
  const setScriptTx = await broadcastAndWait(setScript({ chainId, script: contract }))

  return {
    addrass: gameAddress,
    timestamp: setScriptTx.timestamp,
    salt: base58encode(gameSalt)
  }
}

export const getGamesList = (): Promise<IGameInfo[]> => {
  return null
}
