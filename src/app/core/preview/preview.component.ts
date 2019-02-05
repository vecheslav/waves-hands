import { Component, OnInit } from '@angular/core'
import { TourService } from '../../shared/tour/tour.service'

@Component({
  selector: 'app-preview',
  templateUrl: './preview.component.html',
  styleUrls: ['./preview.component.scss']
})
export class PreviewComponent implements OnInit {

  constructor(private tourService: TourService) { }

  ngOnInit() {
  }

  startWelcome() {
    this.tourService.startWelcome()
  }
}
