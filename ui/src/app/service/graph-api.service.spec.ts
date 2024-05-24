import { TestBed } from '@angular/core/testing';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';

import { GraphApiService } from './graph-api.service';

describe('GraphApiService', () => {
  let service: GraphApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
      providers: [provideHttpClient(withInterceptorsFromDi())],
    });
    service = TestBed.inject(GraphApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
