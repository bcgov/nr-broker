import { TestBed } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';

import { GraphApiService } from './graph-api.service';

describe('GraphApiService', () => {
  let service: GraphApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientModule] });
    service = TestBed.inject(GraphApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
