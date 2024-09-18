import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceBuildsComponent } from './service-builds.component';

describe('ServiceBuildsComponent', () => {
  let component: ServiceBuildsComponent;
  let fixture: ComponentFixture<ServiceBuildsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceBuildsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceBuildsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
