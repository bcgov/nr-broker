import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { InspectorIntentionsComponent } from './inspector-intentions.component';

describe('InspectorIntentionsComponent', () => {
  let component: InspectorIntentionsComponent;
  let fixture: ComponentFixture<InspectorIntentionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorIntentionsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(InspectorIntentionsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', '1');
    fixture.componentRef.setInput('name', 'test');
    fixture.componentRef.setInput('collection', 'service');
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
