import { Component, Input, OnInit } from '@angular/core'
import { Player } from '../shared/match.interface'

const Identity = require('identity-img')

@Component({
  selector: 'app-match-player',
  templateUrl: './match-player.component.html',
  styleUrls: ['./match-player.component.scss']
})
export class MatchPlayerComponent implements OnInit {
  @Input() player: Player = {
    address: 'address'
  }

  avatarUri: string

  constructor() { }

  ngOnInit() {
    this._initAvatar()
  }

  private _initAvatar() {
    if (!this.player.address) {
      return
    }

    const img = new Image()
    img.src = Identity.create(this.player.address)
    this.avatarUri = img.src
  }
}
