import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BreakpointBaseComponent } from './breakpoint-base.component';

describe('BreakpointBaseComponent', () => {
  let component: BreakpointBaseComponent;
  let fixture: ComponentFixture<BreakpointBaseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BreakpointBaseComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BreakpointBaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
