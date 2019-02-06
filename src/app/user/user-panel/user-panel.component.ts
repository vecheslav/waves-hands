import { Component, OnDestroy, OnInit } from '@angular/core'
import { UserService } from '../user.service'
import { IUser } from '../user.interface'
import { Router, NavigationStart } from '@angular/router'
import { filter } from 'rxjs/operators'
import { KeeperService } from 'src/app/auth/keeper.service'
import { NotificationsService } from 'src/app/notifications/notifications.service'

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
  hasUnreadNotifications = false

  private _userSubscriber
  private _notificationsSubscriber

  constructor(private userService: UserService,
    private router: Router,
    private keeperService: KeeperService,
    private notificationsService: NotificationsService) {
    this._userSubscriber = this.userService.user$.subscribe((user: IUser) => {
      this.user = user
      this.isLogged = this.user && this.keeperIsAvailable
    })

    this._notificationsSubscriber = this.notificationsService.notifications$.subscribe(_ => {
      this.hasUnreadNotifications = this.notificationsService.getUnreadCount() > 0
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
    this._notificationsSubscriber.unsubscribe()
  }

  toggleNotifications(): void {
    this.notificationsIsShown = !this.notificationsIsShown
    if (this.notificationsIsShown) {
      this.notificationsService.markAllRead()
      this.hasUnreadNotifications = false
    }
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
