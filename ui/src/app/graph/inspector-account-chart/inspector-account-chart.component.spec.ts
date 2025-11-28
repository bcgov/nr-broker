import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InspectorAccountChartComponent } from './inspector-account-chart.component';

describe('InspectorAccountChartComponent', () => {
  let component: InspectorAccountChartComponent;
  let fixture: ComponentFixture<InspectorAccountChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorAccountChartComponent],
    })
      .compileComponents();

    fixture = TestBed.createComponent(InspectorAccountChartComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
