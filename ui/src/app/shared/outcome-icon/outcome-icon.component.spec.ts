import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OutcomeIconComponent } from './outcome-icon.component';

describe('OutcomeIconComponent', () => {
  let component: OutcomeIconComponent;
  let fixture: ComponentFixture<OutcomeIconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OutcomeIconComponent],
    })
      .compileComponents();

    fixture = TestBed.createComponent(OutcomeIconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
