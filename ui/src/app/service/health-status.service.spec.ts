import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { HealthStatusService } from './health-status.service';

describe('HealthStatusService', () => {
  let service: HealthStatusService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HealthStatusService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
