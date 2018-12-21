import { Component, OnInit } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { IMatch } from '../matches/shared/match.interface'
import { CoreService } from '../core/core.service'
import { address, randomUint8Array } from 'waves-crypto'
import { KeeperService } from '../auth/keeper.service'

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss']
})
export class GameComponent implements OnInit {
  currentMatch: IMatch

  constructor(private route: ActivatedRoute, private core: CoreService, private keeper: KeeperService) {

    this.currentMatch = this.route.snapshot.data.match
  }

  async ngOnInit() {

    // const seed = '763488b5e20e46ceab073708d1c99c1dd2b5b21fd9614a22856a30d1a8621a37'
    // 3Mr6iZj6yx5p32ySonqGupfqqELhCrdFfDM
    // const randomSeed = randomUint8Array(32).toString()
    // const randomAddress = address(randomSeed, 'T')
    // this.keeper.prepareWavesTransfer(randomAddress, 100000000)
  }

}



