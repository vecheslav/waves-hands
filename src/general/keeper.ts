
export interface KeeperAuth {
  address: string
  data: string
  host: string
  prefix: 'WavesWalletAuthentication'
  publicKey: string
  signature: string
}

interface K {
  auth(param: { data: string }): Promise<KeeperAuth>
  signTransaction(p: { type: number, data: any }): Promise<any>
}

const getKeeper = (): K => {
  if (isKeeperInstalled()) {
    return (<any>window).Waves
  }

  throw new Error('No keeper')
}

export interface Keeper {
  auth(): Promise<KeeperAuth>
  transferWaves(recipient: string, amount: number): Promise<any>
}

export const isKeeperInstalled = (): boolean => (<any>window).Waves !== undefined

export const keeper: Keeper = {
  async transferWaves(recipient: string, amount: number): Promise<any> {
    await getKeeper().signTransaction({
      type: 4, data: {
        'amount': {
          'assetId': 'WAVES',
          'tokens': (amount / 100000000).toString(),
        },
        'fee': {
          'assetId': 'WAVES',
          'tokens': '0.001',
        },
        'recipient': recipient,
      },
    }).then(x => {
      x.fee = parseInt(x.fee, undefined)
      x.amount = parseInt(x.amount, undefined)
      return x

    })
  },
  auth(): Promise<KeeperAuth> {
    return getKeeper().auth({ data: '' })
  },
}
