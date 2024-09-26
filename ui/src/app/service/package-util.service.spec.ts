import { TestBed } from '@angular/core/testing';

import { PackageUtilService } from './package-util.service';

describe('PackageUtilService', () => {
  let service: PackageUtilService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PackageUtilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
