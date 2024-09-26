import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceBuildDetailsComponent } from './service-build-details.component';

describe('ServiceBuildDetailsComponent', () => {
  let component: ServiceBuildDetailsComponent;
  let fixture: ComponentFixture<ServiceBuildDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceBuildDetailsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceBuildDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
