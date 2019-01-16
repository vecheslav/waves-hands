import { Injectable, OnDestroy } from '@angular/core'
import { BehaviorSubject } from 'rxjs'
import { IAction } from './actions.interface'
import { UserService } from '../user/user.service'
import { IUser } from '../user/user.interface'

@Injectable()
export class ActionsService implements OnDestroy {
  actions$ = new BehaviorSubject<IAction[]>(<IAction[]>[])
  user: IUser

  private _userSubscriber

  constructor(private userService: UserService) {
    this._userSubscriber = this.userService.user$.subscribe((user: IUser) => {
      this.user = user
      if (this.user) {
        // Init my matches from storage
        this.actions$.next(this._getActionsFromStorage(this.user.address))
      }
    })
  }

  ngOnDestroy() {
    this._userSubscriber.unsubscribe()
  }

  add(action: IAction) {
    if (!action.timestamp) {
      action.timestamp = Date.now()
    }
    this.actions$.next(this.actions$.getValue().concat([action]))
    this._addActionToStorage(this.user.address, action)
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
