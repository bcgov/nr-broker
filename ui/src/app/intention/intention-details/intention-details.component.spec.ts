import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IntentionDetailsComponent } from './intention-details.component';

describe('IntentionDetailsComponent', () => {
  let component: IntentionDetailsComponent;
  let fixture: ComponentFixture<IntentionDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntentionDetailsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(IntentionDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
