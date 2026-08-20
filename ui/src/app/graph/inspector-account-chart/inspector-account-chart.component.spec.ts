import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { InspectorAccountChartComponent } from './inspector-account-chart.component';

describe('InspectorAccountChartComponent', () => {
  let component: InspectorAccountChartComponent;
  let fixture: ComponentFixture<InspectorAccountChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorAccountChartComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorAccountChartComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('account', {} as any);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).match(() => true).forEach(r => r.flush(null));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
