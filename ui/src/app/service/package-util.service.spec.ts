import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { PackageUtilService } from './package-util.service';

describe('PackageUtilService', () => {
  let service: PackageUtilService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(PackageUtilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
