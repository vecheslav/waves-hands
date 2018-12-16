import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, Resolve } from '@angular/router'
import { Observable, of } from 'rxjs'
import { Match } from '../matches/shared/match.interface'

@Injectable()
export class MatchResolver implements Resolve<Observable<Match>> {

  constructor() {
  }

  resolve(route: ActivatedRouteSnapshot): Observable<Match> {
    const matchId = route.paramMap.get('id')
    if (matchId) {
      return of({ id: matchId })
    } else {
      return of({})
    }
  }
}
