import { Component, OnInit } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { Match } from '../matches/shared/match.interface'
import { CoreService } from '../core/core.service'
import { address } from 'waves-crypto'

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss']
})
export class GameComponent implements OnInit {
  currentMatch: Match

  constructor(private route: ActivatedRoute, private core: CoreService) {


    this.currentMatch = this.route.snapshot.data.match
  }

  async ngOnInit() {

    const seed = '763488b5e20e46ceab073708d1c99c1dd2b5b21fd9614a22856a30d1a8621a37'
    const addr = address(seed)
    console.log(addr)

    // const randomSeed = randomBytes(32).toString('hex')
    // const randomAddress = address(randomSeed)
    // const tx = transfer({ recipient: randomAddress, amount: 10000000 })
    // const { id } = await this.core.broadcastAndWait(tx)
    // console.log(id)
  }

}



