import { Component, HostListener, Input, OnInit } from '@angular/core'

@Component({
  selector: 'app-share-match',
  templateUrl: './share-match.component.html',
  styleUrls: ['./share-match.component.scss']
})
export class ShareMatchComponent implements OnInit {
  @Input() url: string

  tooltipIsShown = false

  constructor() { }

  ngOnInit() {
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.tooltipIsShown = true
  }

  @HostListener('mouseleave')
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
