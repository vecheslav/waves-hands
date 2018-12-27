import { Component, OnDestroy, OnInit } from '@angular/core'
import { UserService } from '../user.service'
import { IUser } from '../user.interface'

@Component({
  selector: 'app-user-panel',
  templateUrl: './user-panel.component.html',
  styleUrls: ['./user-panel.component.scss']
})
export class UserPanelComponent implements OnInit, OnDestroy {
  user: IUser

  private _userSubscriber

  constructor(private userService: UserService) {
    this._userSubscriber = this.userService.user$.subscribe((user: IUser) => {
      this.user = user
    })
  }

  async ngOnInit() {
    this.user = await this.userService.getCurrentUser()
  }

  ngOnDestroy() {
    this._userSubscriber.unsubscribe()
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
