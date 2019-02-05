import { Component } from '@angular/core'
import { LangChangeEvent, TranslateService } from '@ngx-translate/core'
import { Title } from '@angular/platform-browser'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'waves-hands'

  constructor(private translate: TranslateService, private titleService: Title) {
    translate.addLangs(['en', 'ru'])
    translate.setDefaultLang('en')

    translate.onLangChange.subscribe((event: LangChangeEvent) => {
      this.titleService.setTitle(translate.instant('TITLE'))
    })

    this._initLang()
  }

  private _initLang() {
    const browserLang = this.translate.getBrowserLang()

    this.translate.use(browserLang.match(/en|ru/) ? browserLang : 'en')
  }
}
