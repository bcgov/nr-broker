import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { postloginGuard } from './postlogin.guard';

describe('postloginGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => postloginGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
