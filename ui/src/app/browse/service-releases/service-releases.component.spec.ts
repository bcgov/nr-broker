import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceReleasesComponent } from './service-releases.component';

describe('ServiceReleasesComponent', () => {
  let component: ServiceReleasesComponent;
  let fixture: ComponentFixture<ServiceReleasesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceReleasesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServiceReleasesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
