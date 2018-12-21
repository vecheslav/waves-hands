import { Component, OnInit } from '@angular/core'
import { compiledScript } from './shared/contract'

@Component({
  selector: 'app-matches',
  templateUrl: './matches.component.html',
  styleUrls: ['./matches.component.scss']
})
export class MatchesComponent implements OnInit {

  constructor() { }

  ngOnInit() {
    console.log(compiledScript)
  }

}


