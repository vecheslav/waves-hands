import { Injectable } from '@angular/core'
import { BehaviorSubject } from 'rxjs'
import { IAction } from './actions.interface'

@Injectable()
export class ActionsService {
  actions$ = new BehaviorSubject<IAction[]>(<IAction[]>[])

  constructor() {
  }

  add(action: IAction) {
    if (!action.timestamp) {
      action.timestamp = Date.now()
    }
    this.actions$.next(this.actions$.getValue().concat([action]))
  }
}
