import { Component, OnDestroy, OnInit } from '@angular/core'
import { UserService } from '../user.service'
import { IUser } from '../user.interface'
import { Router, NavigationStart } from '@angular/router'
import { filter } from 'rxjs/operators'
import { KeeperService } from 'src/app/auth/keeper.service'

@Component({
  selector: 'app-user-panel',
  templateUrl: './user-panel.component.html',
  styleUrls: ['./user-panel.component.scss']
})
export class UserPanelComponent implements OnInit, OnDestroy {
  user: IUser
  notificationsIsShown = false
  keeperIsAvailable = true
  isLogged = false

  private _userSubscriber

  constructor(private userService: UserService,
              private router: Router,
              private keeperService: KeeperService) {
    this._userSubscriber = this.userService.user$.subscribe((user: IUser) => {
      this.user = user

      this.isLogged = this.user && this.keeperIsAvailable
    })

    this.router.events
      .pipe(filter(event => event instanceof NavigationStart))
      .subscribe(event => {
        this.closeNotifications()
      })
  }

  async ngOnInit() {
    this.user = await this.userService.getCurrentUser()
    this.keeperIsAvailable = this.keeperService.isAvailable()
    this.isLogged = this.user && this.keeperIsAvailable
  }

  ngOnDestroy() {
    this._userSubscriber.unsubscribe()
  }

  toggleNotifications(): void {
    this.notificationsIsShown = !this.notificationsIsShown
  }

  closeNotifications(): void {
    this.notificationsIsShown = false
  }

  async signin() {
    if (!this.user) {
      this.user = await this.userService.authUser()
    }
  }

  async logout() {
    await this.userService.logout()
  }
}
