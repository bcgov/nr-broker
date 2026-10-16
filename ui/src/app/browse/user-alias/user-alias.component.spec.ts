import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { CURRENT_USER } from '../../app-initialize.factory';
import { HealthCheckDto } from '../../service/health/health-check.dto';
import { HealthStatusService } from '../../service/health-status.service';

import { UserAliasComponent } from './user-alias.component';

describe('UserAliasComponent', () => {
  let component: UserAliasComponent;
  let fixture: ComponentFixture<UserAliasComponent>;
  let healthSubject: BehaviorSubject<HealthCheckDto>;

  beforeEach(async () => {
    healthSubject = new BehaviorSubject<HealthCheckDto>({
      status: 'ok',
      info: {},
      error: {},
      details: { github: { status: 'up', alias: true } },
    });
    await TestBed.configureTestingModule({
      imports: [UserAliasComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CURRENT_USER, useValue: { vertex: 'user-1', domain: 'idir', email: 'test@example.com', guid: '1', name: 'Test', username: 'test', roles: [] } },
        {
          provide: HealthStatusService,
          useValue: { health$: healthSubject.asObservable() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserAliasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the GitHub link action when alias linking is healthy for the current user', () => {
    fixture.componentRef.setInput('collection', { vertex: 'user-1' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button')).toBeTruthy();
  });

  it('hides the GitHub link action when alias linking is disabled', () => {
    healthSubject.next({
      status: 'ok',
      info: {},
      error: {},
      details: { github: { status: 'up', alias: false } },
    });
    fixture.componentRef.setInput('collection', { vertex: 'user-1' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button')).toBeFalsy();
  });
});
