import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, Resolve } from '@angular/router'
import { Observable, of } from 'rxjs'
import { IMatch, EmptyMatch } from '../matches/shared/match.interface'
import { MatchesService } from '../matches/matches.service'

@Injectable()
export class MatchResolver implements Resolve<Observable<IMatch>> {

  constructor(private matchService: MatchesService) {

  }

  resolve(route: ActivatedRouteSnapshot): Observable<IMatch> {
    const matchAddress = route.paramMap.get('address')
    return of(EmptyMatch)
  }
}
