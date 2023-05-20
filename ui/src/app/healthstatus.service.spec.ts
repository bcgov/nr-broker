import { TestBed } from '@angular/core/testing';

import { HealthstatusService } from './healthstatus.service';

describe('HealthstatusService', () => {
  let service: HealthstatusService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HealthstatusService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
