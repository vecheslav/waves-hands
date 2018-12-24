import { DataEntry, KeeperStatus } from '../shared/keeper.interface'
import { IDataTransaction } from 'waves-transactions/transactions'

export class KeeperServiceMock {
  constructor() {
  }

  get keeperStatus(): KeeperStatus {
    return { isExist: true }
  }

  isAvailable(): boolean {
    return this.keeperStatus.isExist
  }

  async prepareWavesTransfer(recipient: string, amount: number): Promise<any> {
    return Promise.resolve({
      id: '123',
      type: 4,
      recipient: recipient,
      amount: amount.toString(),
      feeAssetId: 'WAVES',
      assetId: 'WAVES',
      fee: '100',
      senderPublicKey: '123'
    })
  }

  async prepareDataTx(data: DataEntry[], senderPublicKey: string, fee: number): Promise<IDataTransaction> {
    return Promise.resolve({
      id: '123',
      type: 12,
      feeAssetId: 'WAVES',
      assetId: 'WAVES',
      fee: '100',
      senderPublicKey: '123',
      data,
      timestamp: 12,
      version: 0,
      proofs: []
    } as IDataTransaction)
  }
}
