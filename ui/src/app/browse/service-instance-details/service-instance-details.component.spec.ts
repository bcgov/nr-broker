import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceInstanceDetailsComponent } from './service-instance-details.component';

describe('ServiceInstanceDetailsComponent', () => {
  let component: ServiceInstanceDetailsComponent;
  let fixture: ComponentFixture<ServiceInstanceDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceInstanceDetailsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceInstanceDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
