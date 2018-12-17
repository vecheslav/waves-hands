import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { TTx } from 'waves-transactions/transactions'
import { retry } from 'rxjs/operators'

@Injectable({
  providedIn: 'root'
})
export class CoreService {
  constructor(private http: HttpClient) { }

  async broadcast(tx: TTx): Promise<TTx> {
    return this.http.post<TTx>('transactions/broadcast', tx)
      .pipe(retry())
      .toPromise()
  }

  async waitForTx(txId: string): Promise<TTx> {
    return this.http.get<TTx>(`transactions/info/${txId}`)
      .pipe(retry())
      .toPromise()
  }

  async broadcastAndWait(tx: TTx): Promise<TTx> {
    const { id } = await this.broadcast(tx)
    const r = await this.waitForTx(id)
    return r
  }
}
