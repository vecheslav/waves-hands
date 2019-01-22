import { Injectable } from '@angular/core'
import { BehaviorSubject } from 'rxjs'
import { IAction } from './actions.interface'
import { IUser } from '../user/user.interface'

@Injectable()
export class ActionsService {
  actions$ = new BehaviorSubject<IAction[]>(<IAction[]>[])

  private _user: IUser

  constructor() {
  }

  add(action: IAction) {
    if (!this._user) {
      return
    }

    if (!this._user.address) {
      return
    }

    if (!action.timestamp) {
      action.timestamp = Date.now()
    }
    this.actions$.next(this.actions$.getValue().concat([action]))
    this._addActionToStorage(this._user.address, action)
  }

  selectUser(user: IUser) {
    this._user = user

    if (user && user.address) {
      this.actions$.next(this._getActionsFromStorage(user.address))
    }
  }

  private _getActionsFromStorage(userAddress: string): IAction[] {
    const allActions = JSON.parse(localStorage.getItem('actions')) || {}

    return allActions[userAddress] || []
  }

  private _addActionToStorage(userAddress: string, action: IAction): IAction {
    const allActions = JSON.parse(localStorage.getItem('actions')) || {}
    allActions[userAddress] = allActions[userAddress] || []
    allActions[userAddress].push(action)

    localStorage.setItem('actions', JSON.stringify(allActions))

    return action
  }
}
