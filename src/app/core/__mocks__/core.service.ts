import { IAliasTransaction, IIssueTransaction, TTx } from 'waves-transactions/transactions'

export class CoreServiceMock {
  constructor() { }

  async broadcast(tx: TTx): Promise<any> {
    return Promise.resolve(tx as IAliasTransaction)
  }

  async waitForTx(txId: string): Promise<TTx> {
    return Promise.resolve({
      id: '123',
      type: 12,
      feeAssetId: 'WAVES',
      assetId: 'WAVES',
      fee: '100',
      senderPublicKey: '123',
      timestamp: 12,
      version: 0,
      proofs: []
    } as IAliasTransaction)
  }

  async broadcastAndWait(tx: TTx): Promise<TTx> {
    const { id } = await this.broadcast(tx)
    const r = await this.waitForTx(id)
    return r
  }
}
