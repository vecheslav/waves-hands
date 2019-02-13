import { Injectable } from '@angular/core'
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router'
import { Observable } from 'rxjs'
import { NotificationsService } from '../../notifications/notifications.service'
import { KeeperService } from '../../auth/keeper.service'
import { environment } from '../../../environments/environment'
import { ErrorCode } from '../../shared/error-code'
import { NotificationType } from '../../notifications/notifications.interface'

@Injectable()
export class MatchGuard implements CanActivate {
  constructor(private keeperService: KeeperService,
    private notificationsService: NotificationsService) {
  }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {
    const matchAddress = next.paramMap.get('address')
    const keeperIsAvailable = this.keeperService.isAvailable()

    return new Promise<boolean>(async resolve => {
      try {
        if (!matchAddress) {
          if (keeperIsAvailable) {
            const keeperPublicState = await this.keeperService.publicState()

            if (keeperPublicState.account &&
              keeperPublicState.account.balance.available < environment.gameBetAmount) {
              throw { ... new Error('You have not enough balance to play!'), code: ErrorCode.NotEnoughBalance }
            }

            if (keeperPublicState.account && keeperPublicState.account.networkCode !== environment.chainId) {
              throw { ... new Error('Wrong address!'), code: ErrorCode.WrongAddress }
            }
          }
        }

        resolve(true)
      } catch (err) {
        if (!this._handleErrors(err)) {
          console.error(err)
        }

        resolve(false)
      }
    })
  }

  private _handleErrors(err: any): boolean {
    if (err && err.code) {
      switch (err.code) {
        case ErrorCode.UserRejected:
          this.notificationsService.add({
            type: NotificationType.Error,
            message: 'ERROR_USER_REJECTED'
          })
          return true
        case ErrorCode.NotEnoughBalance:
          this.notificationsService.add({
            type: NotificationType.Error,
            message: 'ERROR_BALANCE'
          })
          return true
        case ErrorCode.ApiRejected:
          this.notificationsService.add({
            type: NotificationType.Error,
            message: 'ERROR_API_REJECTED'
          })
          return true
        case ErrorCode.WrongAddress:
          this.notificationsService.add({
            type: NotificationType.Error,
            message: 'ERROR_WRONG_ADDRESS'
          })
          return true
      }
    }

    return false
  }
}
