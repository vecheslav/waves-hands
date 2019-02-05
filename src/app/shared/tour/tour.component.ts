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

  private _activeSubscriber

  constructor(private tourService: TourService,
              private router: Router) {
    this._activeSubscriber = this.tourService.welcome$.subscribe(activated => {
      this.isActive = activated
    })
  }

  ngOnInit(): void {
    this.isActive = this.router.url === '/' && this.tourService.isActiveWelcomePopup()
  }

  ngOnDestroy(): void {
    this._activeSubscriber.unsubscribe()
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
