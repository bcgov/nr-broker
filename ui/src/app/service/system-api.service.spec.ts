import { TestBed } from '@angular/core/testing';

import { SystemApiService } from './system-api.service';

describe('SystemApiService', () => {
  let service: SystemApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SystemApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
