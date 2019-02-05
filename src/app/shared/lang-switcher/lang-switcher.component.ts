import { Component, OnDestroy, OnInit } from '@angular/core'
import { Language } from '../languages'
import { LangChangeEvent, TranslateService } from '@ngx-translate/core'

@Component({
  selector: 'app-lang-switcher',
  templateUrl: './lang-switcher.component.html',
  styleUrls: ['./lang-switcher.component.scss']
})
export class LangSwitcherComponent implements OnInit, OnDestroy {
  currentLang: Language = 'en'

  private _langSubscriber

  constructor(private translate: TranslateService) {
    this._langSubscriber = translate.onLangChange.subscribe((event: LangChangeEvent) => {
      this.currentLang = event.lang as Language
    })
  }

  ngOnInit() {
  }

  ngOnDestroy(): void {
    this._langSubscriber.unsubscribe()
  }

  selectLang(lang: Language) {
    if (lang === this.currentLang)  {
      return
    }

    this.translate.use(lang)
  }
}
