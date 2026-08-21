import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ServiceInstanceDetailsComponent } from './service-instance-details.component';

describe('ServiceInstanceDetailsComponent', () => {
  let component: ServiceInstanceDetailsComponent;
  let fixture: ComponentFixture<ServiceInstanceDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceInstanceDetailsComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceInstanceDetailsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('instance', null);
    fixture.componentRef.setInput('showName', false);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
