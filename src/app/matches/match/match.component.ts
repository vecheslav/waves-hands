import { Component, Input, OnInit } from '@angular/core'
import { Match } from '../shared/match.interface'
import { Router } from '@angular/router'

@Component({
  selector: 'app-match',
  templateUrl: './match.component.html',
  styleUrls: ['./match.component.scss']
})
export class MatchComponent implements OnInit {
  @Input() match: Match

  constructor(private router: Router) { }

  ngOnInit() {
  }

  close() {
    this.router.navigate(['../'])
  }
}
