import { randomBytes } from 'crypto'
import { address, publicKey } from '@waves/waves-crypto'
import { environment } from 'src/environments/environment'

export const randomAccount = () => {
  const seed = randomBytes(32).toString('hex')
  return {
    seed,
    address: address(seed, environment.chainId),
    publicKey: publicKey(seed),
  }
}
