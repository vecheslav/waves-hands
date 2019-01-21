import { Component, Input, OnChanges } from '@angular/core'
import { Player } from '../../matches/shared/match.interface'

const Identity = require('identity-img')

@Component({
  selector: 'app-match-player',
  templateUrl: './match-player.component.html',
  styleUrls: ['./match-player.component.scss']
})
export class MatchPlayerComponent implements OnChanges {
  @Input() player: Player

  avatarUri: string

  constructor() { }

  ngOnChanges() {
    this._initAvatar()
  }

  private _initAvatar() {
    if (!this.player) {
      return
    }
    
    if (!this.player.address) {
      return
    }

    const img = new Image()
    img.src = Identity.create(this.player.address)
    this.avatarUri = img.src
  }
}
