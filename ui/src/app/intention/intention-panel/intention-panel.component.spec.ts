import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { IntentionPanelComponent } from './intention-panel.component';

describe('IntentionPanelComponent', () => {
  let component: IntentionPanelComponent;
  let fixture: ComponentFixture<IntentionPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntentionPanelComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IntentionPanelComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', '1');
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).match(() => true).forEach((r) => r.flush(null));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
