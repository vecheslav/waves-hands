import { randomBytes } from 'crypto'
import { address, publicKey } from '@waves/waves-crypto'

export const randomSeed = () => randomBytes(32).toString('hex')

export const randomAccount = (chainId: string) => {
  const seed = randomSeed()

  return {
    seed,
    address: address(seed, chainId),
    publicKey: publicKey(seed),
  }
}