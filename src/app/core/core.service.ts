import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { TTx } from 'waves-transactions/transactions'
import { retryWhen, delay, take, concat } from 'rxjs/operators'
import { Observable } from 'rxjs'
import { environment } from 'src/environments/environment'

@Injectable({
  providedIn: 'root'
})
export class CoreService {
  constructor(private http: HttpClient) { }

  async broadcast(tx: TTx): Promise<TTx> {
    return this.http.post<TTx>('transactions/broadcast', tx)
      .pipe(retryWhen(n =>
        n.pipe(
          delay(environment.retryDelay),
          take(environment.broadcastRetryLimit),
          concat(Observable.throw(new Error(`Retry limit exceeded! Tried ${environment.broadcastRetryLimit} times.`)))
        )))
      .toPromise()
  }

  async waitForTx(txId: string): Promise<TTx> {
    return this.http.get<TTx>(`transactions/info/${txId}`)
      .pipe(retryWhen(n => n.pipe(delay(environment.retryDelay))))
      .toPromise()
  }

  async broadcastAndWait(tx: TTx): Promise<TTx> {
    const { id } = await this.broadcast(tx)
    const r = await this.waitForTx(id)
    return r
  }
}
