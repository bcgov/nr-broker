import { TestBed } from '@angular/core/testing';

import { CollectionUtilService } from './collection-util.service';

describe('CollectionUtilService', () => {
  let service: CollectionUtilService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CollectionUtilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
