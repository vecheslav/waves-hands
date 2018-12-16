import { Injectable } from '@angular/core'
import { TTx } from 'waves-transactions/transactions'

@Injectable({
  providedIn: 'root'
})
export class CoreService {

  constructor() {
  }

  async broadcast(tx: TTx): Promise<TTx> {
    return null
  }

  async waitForTx(txId: string): Promise<TTx> {
    return null
  }

  async broadcastAndWait(tx: TTx): Promise<TTx> {
    return null
  }

}
