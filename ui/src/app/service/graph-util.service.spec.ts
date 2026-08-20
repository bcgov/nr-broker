import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GraphUtilService } from './graph-util.service';

describe('UtilService', () => {
  let service: GraphUtilService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    service = TestBed.inject(GraphUtilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
