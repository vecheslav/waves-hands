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

  private _actionsSubscriber

  constructor(private actionsService: ActionsService) {
    this._actionsSubscriber = this.actionsService.actions$.subscribe((actions: IAction[]) => {
      this.actions = actions
    })
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    this._actionsSubscriber.unsubscribe()
  }
}
