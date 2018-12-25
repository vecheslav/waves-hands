import { randomBytes } from 'crypto'
import { address, publicKey } from 'waves-crypto'
import { environment } from 'src/environments/environment'

export const randomAccount = () => {
  const seed = randomBytes(32).toString('hex')
  return {
    seed,
    address: address(seed, environment.chainId),
    publicKey: publicKey(seed),
  }
}
//
// export const copyText = (value: string) => {
//   const selBox = document.createElement('textarea') as HTMLTextAreaElement
//   selBox.style.position = 'fixed'
//   selBox.style.left = '0'
//   selBox.style.top = '0'
//   selBox.style.opacity = '0'
//   selBox.value = value
//   document.body.appendChild(selBox)
//   selBox.focus()
//   selBox.select()
//   document.execCommand('copy')
//   document.body.removeChild(selBox)
//   return true
// }
