import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CollectionUtilService } from './collection-util.service';

describe('CollectionUtilService', () => {
  let service: CollectionUtilService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    service = TestBed.inject(CollectionUtilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
