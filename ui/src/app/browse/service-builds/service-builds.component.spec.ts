import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ServiceBuildsComponent } from './service-builds.component';

describe('ServiceBuildsComponent', () => {
  let component: ServiceBuildsComponent;
  let fixture: ComponentFixture<ServiceBuildsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceBuildsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceBuildsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
