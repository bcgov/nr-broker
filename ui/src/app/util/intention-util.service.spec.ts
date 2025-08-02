import { TestBed } from '@angular/core/testing';

import { IntentionUtilService } from './intention-util.service';

describe('IntentionUtilService', () => {
  let service: IntentionUtilService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IntentionUtilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
