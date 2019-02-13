import { transfer } from '@waves/waves-transactions'
import { IWavesApi } from '../src/app/hands/api'
import { publicKey, address } from '@waves/waves-crypto'
import { randomBytes } from 'crypto'
import { defaultFee } from './fees'
import * as progress from 'cli-progress'

export const printAddress = (...addressAndText: string[]) => console.log(`${addressAndText.length > 1 ? addressAndText[0] + ' ' : ''}http://wavesexplorer.com/address/${addressAndText[addressAndText.length - 1]}`)

export const oneOf = <T>(values: T[]): T => values[Math.floor(Math.random() * values.length)]

export const bruteForce = async <T>(times: number, prepareParams: (index: number) => Promise<T> | T, checkParams: (params: T) => boolean, action: (params: T) => Promise<any>) => {
  const bar = new progress.Bar({ stream: process.stdout }, progress.Presets.shades_classic)
  bar.start(times, 0)
  for (let index = 0; index < times; index++) {
    let c = false
    try {
      let p
      do {
        p = prepareParams(index) as any
        if (p.then && typeof p.then === 'function')
          p = await p
      } while (!checkParams(p))
      await action(p)
    } catch (error) {
      bar.update(index)
      c = true
    }

    if (!c)
      throw new Error('Expected to fail')
      
    bar.update(times)
    bar.stop()
  }
}

export const tests = (testingHostSeed: string, api: IWavesApi) => {

  const config = api.config()
  const hostAddress = address(testingHostSeed, config.chainId)
  const hostPublicKey = publicKey(testingHostSeed)

  const randomSeed = (): string => randomBytes(32).toString('hex')

  const ensureHostHasEnoughBalance = async (balance: number) => {
    const hostBalance = await api.getBalance(hostAddress)
    if (hostBalance < balance)
      throw new Error(`Not enouth balance on host ${hostAddress} to run test`)
  }

  const fuelAddressAndWait = async (address: string, balance: number) => {
    const alreadyOnBalance = await api.getBalance(address)
    const missing = balance - alreadyOnBalance
    await ensureHostHasEnoughBalance(missing + defaultFee.transfer)
    const t = transfer({ senderPublicKey: hostPublicKey, amount: missing, recipient: address }, testingHostSeed)
    await api.broadcastAndWait(t)
  }

  const randomSeedWithBalance = async (balance: number): Promise<string> => {
    const s = randomSeed()
    const a = address(s, config.chainId)
    await fuelAddressAndWait(a, balance)
    return s
  }

  const randomAccount = () => {
    const seed = randomSeed()

    return {
      seed,
      address: address(seed, config.chainId),
      publicKey: publicKey(seed),
    }
  }

  const randomAccountWithBalance = async (balance: number): Promise<{ address: string, seed: string, publicKey: string }> => {
    const seed = await randomSeedWithBalance(balance)

    return {
      seed,
      address: address(seed, config.chainId),
      publicKey: publicKey(seed),
    }
  }

  return {
    randomSeedWithBalance,
    randomAccountWithBalance,
    randomSeed,
    randomAccount,
    fuelAddressAndWait,
  }
}
