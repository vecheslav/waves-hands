import { Injectable } from '@angular/core'
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router'
import { Observable } from 'rxjs'
import { UserService } from './user.service'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private userService: UserService) {
  }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {
    const currentUser = this.userService.getCurrentUser()

    if (!currentUser) {
      this.userService.authUser()
    }
    return true
  }
}
