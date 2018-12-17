import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, Resolve } from '@angular/router'
import { Observable, of } from 'rxjs'
import { Match } from '../matches/shared/match.interface'

@Injectable()
export class MatchResolver implements Resolve<Observable<Match>> {

  constructor() {
  }

  resolve(route: ActivatedRouteSnapshot): Observable<Match> {
    const matchAddress = route.paramMap.get('address')
    if (matchAddress) {
      return of({ address: matchAddress })
    } else {
      return of({})
    }
  }
}
