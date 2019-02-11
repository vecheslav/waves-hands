import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import { HttpClient } from '@angular/common/http'
import { environment } from '../../../environments/environment'

export interface BookingStatus {
  isReserved: boolean
}

@Injectable()
export class BookingService {
  constructor(private http: HttpClient) {
  }

  reserve(matchAddress: string): Observable<BookingStatus> {
    return this.http.post<BookingStatus>(environment.bookingServiceEndpoint + '/reserve', {
      matchAddress
      // proofs
    })
  }

  isReserved(matchAddress: string): Observable<BookingStatus> {
    return this.http.get<BookingStatus>(environment.bookingServiceEndpoint + '/reserve')
  }
}
