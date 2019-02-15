import { randomBytes } from 'crypto'
import { address, publicKey } from '@waves/waves-crypto'
import { environment } from 'src/environments/environment'
import { MatchStatus } from './match.interface'

export const randomAccount = () => {
  const seed = randomBytes(32).toString('hex')
  return {
    seed,
    address: address(seed, environment.chainId),
    publicKey: publicKey(seed),
  }
}

export const statusIsWaiting = (status: MatchStatus) => {
  return status === MatchStatus.WaitingBothToReveal ||
         status === MatchStatus.WaitingP1ToReveal ||
         status === MatchStatus.WaitingP2ToReveal ||
         status === MatchStatus.WaitingForDeclare ||
         status === MatchStatus.WaitingForPayout
}
