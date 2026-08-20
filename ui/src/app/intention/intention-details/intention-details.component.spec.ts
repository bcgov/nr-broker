import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { IntentionDetailsComponent } from './intention-details.component';

describe('IntentionDetailsComponent', () => {
  let component: IntentionDetailsComponent;
  let fixture: ComponentFixture<IntentionDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntentionDetailsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IntentionDetailsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('intention', { event: { transient: false, provider: 'test' }, actions: [], transaction: {}, user: { id: null }, id: '1' } as any);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
