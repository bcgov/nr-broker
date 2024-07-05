import { TestBed } from '@angular/core/testing';

import { PackageApiService } from './package-api.service';

describe('PackageApiService', () => {
  let service: PackageApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PackageApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
