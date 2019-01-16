import { Component, OnInit, Input } from '@angular/core'
import { IAction, ActionType } from '../actions.interface'

@Component({
  selector: 'app-action-item',
  templateUrl: './action-item.component.html',
  styleUrls: ['./action-item.component.scss']
})
export class ActionItemComponent implements OnInit {
  @Input() action: IAction

  actionType = ActionType

  constructor() { }

  ngOnInit() {
  }

}
