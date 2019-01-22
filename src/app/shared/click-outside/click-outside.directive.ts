import { Directive, Output, EventEmitter, HostListener, ElementRef } from '@angular/core'

@Directive({
  selector: '[appClickOutside]'
})
export class ClickOutsideDirective {
  @Output() clickOutside = new EventEmitter<MouseEvent>()

  constructor(private _elementRef: ElementRef) {
  }

  @HostListener('document:click', ['$event', '$event.target'])
  onClick(event: MouseEvent, targetElement: HTMLElement): void {
    if (!targetElement) {
      return
    }

    const clickedInside = this._elementRef.nativeElement.contains(targetElement)
    if (!clickedInside) {
      this.clickOutside.emit(event)
    }
  }
}
