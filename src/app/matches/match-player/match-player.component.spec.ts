import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MatchPlayerComponent } from './match-player.component';

describe('MatchPlayerComponent', () => {
  let component: MatchPlayerComponent;
  let fixture: ComponentFixture<MatchPlayerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MatchPlayerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MatchPlayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
