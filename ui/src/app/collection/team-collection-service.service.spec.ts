import { TestBed } from '@angular/core/testing';

import { TeamCollectionServiceService } from './team-collection-service.service';

describe('TeamCollectionServiceService', () => {
  let service: TeamCollectionServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TeamCollectionServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
