import { Injectable, NgZone } from '@angular/core'
import * as Driver from 'driver.js'
import { BehaviorSubject } from 'rxjs'

@Injectable()
export class TourService {
  activated$ = new BehaviorSubject<boolean>(false)

  private _driver: Driver

  constructor(private ngZone: NgZone) {
    this._driver = new Driver({
      animate: false,
      opacity: 0.3,
      padding: 8,
      nextBtnText: 'Next',
      prevBtnText: 'Previous',
      onReset: () => {
        this.activated$.next(false)
      }
    })
  }

  startTour() {
    this.activated$.next(true)
    this._defineSteps()

    setTimeout(() => {
      this.ngZone.runOutsideAngular(() => {
        this._driver.start()
      })
    })
  }

  isActiveWelcomePopup(): boolean {
    const tourDisabled = localStorage.getItem('tourDisabled')
    if (tourDisabled === null) {
      return true
    }

    return !JSON.parse(tourDisabled)
  }

  disableWelcomePopup() {
    localStorage.setItem('tourDisabled', JSON.stringify(true))
  }

  private _defineSteps() {
    this._driver.defineSteps([
      {
        element: '#start-game',
        popover: {
          title: 'Step title 1',
          description: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Modi alias animi molestia in, aperiam.',
          position: 'bottom-right',
        },
      },
      {
        element: '.matches-item:first-child',
        popover: {
          title: 'Step title 2',
          description: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Modi alias animi molestia in, aperiam.',
          position: 'bottom-center',
        },
      },
      {
        element: '.matches-item:first-child .match-card__status',
        popover: {
          title: 'Step title 3',
          description: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Modi alias animi molestia in, aperiam.',
          position: 'bottom-center',
        },
      }
    ])
  }
}
