import { Component, OnDestroy, OnInit } from '@angular/core'
import { TourService } from './tour.service'
import { Router } from '@angular/router'

@Component({
  selector: 'app-tour',
  templateUrl: './tour.component.html',
  styleUrls: ['./tour.component.scss']
})
export class TourComponent implements OnInit, OnDestroy {
  isActive = false

  constructor(private tourService: TourService,
              private router: Router) { }

  ngOnInit(): void {
    this.isActive = this.router.url === '/' && this.tourService.isActiveWelcomePopup()
  }

  ngOnDestroy(): void {
  }

  startTour() {
    this.close()
    this.tourService.startTour()
  }

  close() {
    this.isActive = false
    this.tourService.disableWelcomePopup()
  }
}
