import { Component, OnDestroy, OnInit } from '@angular/core'
import { UserService } from '../user.service'
import { IUser } from '../user.interface'
import { Router, NavigationStart } from '@angular/router'
import { filter } from 'rxjs/operators'

@Component({
  selector: 'app-user-panel',
  templateUrl: './user-panel.component.html',
  styleUrls: ['./user-panel.component.scss']
})
export class UserPanelComponent implements OnInit, OnDestroy {
  user: IUser
  actionsIsShown = false

  private _userSubscriber

  constructor(private userService: UserService, private router: Router) {
    this._userSubscriber = this.userService.user$.subscribe((user: IUser) => {
      this.user = user
    })

    this.router.events
      .pipe(filter(event => event instanceof NavigationStart))
      .subscribe(event => {
        this.closeActions()
      })
  }

  async ngOnInit() {
    this.user = await this.userService.getCurrentUser()
  }

  ngOnDestroy() {
    this._userSubscriber.unsubscribe()
  }

  toggleActions(): void {
    this.actionsIsShown = !this.actionsIsShown
  }

  closeActions(): void {
    this.actionsIsShown = false
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
