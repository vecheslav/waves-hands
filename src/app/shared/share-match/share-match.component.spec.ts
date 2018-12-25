import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ShareMatchComponent } from './share-match.component';

describe('ShareMatchComponent', () => {
  let component: ShareMatchComponent;
  let fixture: ComponentFixture<ShareMatchComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ShareMatchComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ShareMatchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
