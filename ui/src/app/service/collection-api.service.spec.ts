import { TestBed } from '@angular/core/testing';

import { CollectionApiService } from './collection-api.service';

describe('CollectionApiService', () => {
  let service: CollectionApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CollectionApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
