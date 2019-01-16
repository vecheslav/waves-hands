import { Component, OnDestroy, OnInit } from '@angular/core'
import { ActionsService } from './actions.service'
import { IAction } from './actions.interface'

@Component({
  selector: 'app-actions',
  templateUrl: './actions.component.html',
  styleUrls: ['./actions.component.scss']
})
export class ActionsComponent implements OnInit, OnDestroy {
  actions: IAction[] = []
  isLoading = true

  private _actionsSubscriber

  constructor(private actionsService: ActionsService) {
    this._actionsSubscriber = this.actionsService.actions$.subscribe((actions: IAction[]) => {
      this.actions = actions.sort((a, b) => (a.timestamp > b.timestamp) ? -1 : 1)

      this.isLoading = false
    })
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    this._actionsSubscriber.unsubscribe()
  }
}
