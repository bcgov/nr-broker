import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceInstancesComponent } from './service-instances.component';

describe('InspectorInstancesComponent', () => {
  let component: ServiceInstancesComponent;
  let fixture: ComponentFixture<ServiceInstancesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceInstancesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceInstancesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
