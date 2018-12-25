import { Component, Input, OnInit } from '@angular/core'

export enum ShareType {
  Icon = 'icon',
  Buttons = 'buttons'
}

@Component({
  selector: 'app-share-match',
  templateUrl: './share-match.component.html',
  styleUrls: ['./share-match.component.scss']
})
export class ShareMatchComponent implements OnInit {
  @Input() url: string
  @Input() options = {
    type: ShareType.Icon
  }

  tooltipIsShown = false

  constructor() { }

  ngOnInit() {
  }

  onMouseEnter(): void {
    this.tooltipIsShown = true
  }

  onMouseLeave(): void {
    this.tooltipIsShown = false
  }

  share(event: Event) {
    event.preventDefault()

    const target = event.currentTarget as HTMLLinkElement
    const strParam = 'left=100,top=100,width=600,height=400,resizable=true'

    window.open(target.href, 'Share link', strParam).focus()

    return false
  }
}
