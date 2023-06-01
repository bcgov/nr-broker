import { TestBed } from '@angular/core/testing';

import { IntentionApiService } from './intention-api.service';

describe('IntentionApiService', () => {
  let service: IntentionApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IntentionApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
