import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IntentionPanelComponent } from './intention-panel.component';

describe('IntentionPanelComponent', () => {
  let component: IntentionPanelComponent;
  let fixture: ComponentFixture<IntentionPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntentionPanelComponent],
    })
      .compileComponents();

    fixture = TestBed.createComponent(IntentionPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
