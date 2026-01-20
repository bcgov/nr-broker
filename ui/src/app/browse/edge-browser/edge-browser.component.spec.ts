import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EdgeBrowserComponent } from './edge-browser.component';

describe('EdgeBrowserComponent', () => {
  let component: EdgeBrowserComponent;
  let fixture: ComponentFixture<EdgeBrowserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EdgeBrowserComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EdgeBrowserComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
