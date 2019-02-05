import { Injectable, NgZone } from '@angular/core'
import * as Driver from 'driver.js'
import { BehaviorSubject } from 'rxjs'
import { LangChangeEvent, TranslateService } from '@ngx-translate/core'

@Injectable()
export class TourService {
  activated$ = new BehaviorSubject<boolean>(false)

  private _driver: Driver

  constructor(private ngZone: NgZone, private translate: TranslateService) {
    this._driver = new Driver({
      animate: false,
      opacity: 0.3,
      padding: 8,
      closeBtnText: 'Close',
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
    const defaultPopover = {
      closeBtnText: this.translate.instant('TOUR.CLOSE_BUTTON'),
      nextBtnText: this.translate.instant('TOUR.NEXT_BUTTON'),
      prevBtnText: this.translate.instant('TOUR.PREV_BUTTON'),
    }

    this._driver.defineSteps([
      {
        element: '#start-game',
        popover: {
          ...defaultPopover,
          title: this.translate.instant('TOUR.STEP1_TITLE'),
          description: this.translate.instant('TOUR.STEP1_TEXT'),
          position: 'bottom-right',
        },
      },
      {
        element: '.matches-item:first-child',
        popover: {
          ...defaultPopover,
          title: this.translate.instant('TOUR.STEP2_TITLE'),
          description: this.translate.instant('TOUR.STEP2_TEXT'),
          position: 'bottom-center',
          offset: 7,
        },
      },
      {
        element: '.matches-item:first-child .match-card__status',
        popover: {
          ...defaultPopover,
          title: this.translate.instant('TOUR.STEP3_TITLE'),
          description: this.translate.instant('TOUR.STEP3_TEXT'),
          position: 'bottom-center',
          offset: 7,
        },
      }
    ])
  }
}
