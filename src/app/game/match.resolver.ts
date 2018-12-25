import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, Resolve } from '@angular/router'
import { from, Observable, of } from 'rxjs'
import { IMatch, EmptyMatch } from '../matches/shared/match.interface'
import { MatchesService } from '../matches/matches.service'

@Injectable()
export class MatchResolver implements Resolve<Observable<IMatch>> {

  constructor(private matchService: MatchesService) {

  }

  resolve(route: ActivatedRouteSnapshot): Observable<IMatch> {
    const matchAddress = route.paramMap.get('address')

    if (matchAddress) {
      return from(this.matchService.getMatch(matchAddress))
    } else {
      return of(EmptyMatch)
    }
  }
}
