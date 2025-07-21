import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IntentionSummaryComponent } from './intention-summary.component';

describe('IntentionSummaryComponent', () => {
  let component: IntentionSummaryComponent;
  let fixture: ComponentFixture<IntentionSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntentionSummaryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(IntentionSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
