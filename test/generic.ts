import { defaultFee } from './fees'
import { gameBet } from '../src/app/hands/game-related/game'
import { KeeperAuth, KeeperPublicState } from '../src/app/hands/keeper/interfaces'
import { transfer, TTx, ITransferTransaction, data } from '@waves/waves-transactions'
import { conf, testingHostSeed } from './settings'
import { axiosHttp } from '../src/app/hands/api-axios'
import { tests } from '../test'
import { api as apiCtor } from '../src/app/hands/api'
import { IKeeper } from '../src/app/auth/shared/keeper.interface'


const api = apiCtor(conf, axiosHttp)
const { randomAccountWithBalance } = tests(testingHostSeed, api)

export const keeperMock = (seeds: string[]): IKeeper => {
  let i = 0
  return {
    on: () => { },
    auth: (): Promise<KeeperAuth> => Promise.resolve<KeeperAuth>({
      address: '',
      data: '',
      host: 'string',
      prefix: 'WavesWalletAuthentication',
      publicKey: '',
      signature: 'string',
    }),
    prepareDataTransaction: (map: Record<string, string | number | boolean | Buffer | Uint8Array | number[]>, senderPublicKey?: string) =>
      Promise.resolve(data({ senderPublicKey: senderPublicKey, additionalFee: 400000, data: Object.keys(map).map(key => ({ key, value: map[key] })) }, seeds[i++])),

    signTransaction: (): Promise<TTx> => Promise.resolve(transfer({ recipient: '', amount: 1 }, '')),
    prepareWavesTransfer: (recipient: string, amount: number): Promise<ITransferTransaction> => Promise.resolve(transfer({ recipient, amount }, seeds[i++])),
    publicState: (): Promise<KeeperPublicState> => Promise.resolve<KeeperPublicState>({
      initialized: false,
      locked: false,
    }),
  }
}

export const createPlayers = async () => {
  const [{ seed: player1Seed, address: player1Address }, { seed: player2Seed, address: player2Address },] = await Promise.all([randomAccountWithBalance(gameBet + defaultFee.transfer),
  randomAccountWithBalance(gameBet + defaultFee.transfer)])
  return { player1Address, player2Address, player1Seed, player2Seed }
}
