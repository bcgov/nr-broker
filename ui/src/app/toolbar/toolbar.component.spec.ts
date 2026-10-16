import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CURRENT_USER, INITIAL_PREFERENCES } from '../app-initialize.factory';
import { HealthCheckDto } from '../service/health/health-check.dto';
import { HealthStatusService } from '../service/health-status.service';

import { ToolbarComponent } from './toolbar.component';

describe('ToolbarComponent', () => {
  let component: ToolbarComponent;
  let fixture: ComponentFixture<ToolbarComponent>;
  let healthSubject: BehaviorSubject<HealthCheckDto | undefined>;
  const openFromComponent = vi.fn();

  beforeEach(async () => {
    openFromComponent.mockReset();
    healthSubject = new BehaviorSubject<HealthCheckDto | undefined>({
      status: 'ok',
      info: {},
      error: {},
      details: { github: { status: 'up', alias: false } },
    });
    await TestBed.configureTestingModule({
      imports: [ToolbarComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CURRENT_USER, useValue: { domain: 'idir', email: 'test@example.com', guid: '1', name: 'Test', username: 'test', roles: [], alias: undefined } },
        { provide: INITIAL_PREFERENCES, useValue: { browseCollectionDefault: 'project', browseConnectionFilter: 'connected', browseConnectionSize: 10, graphFollows: 'edge', graphHideRestricted: false, homeSectionTab: 0, ignoreGitHubLink: false, teamGroupBy: 'user' } },
        {
          provide: HealthStatusService,
          useValue: { health$: healthSubject.asObservable() },
        },
        {
          provide: MatSnackBar,
          useValue: { openFromComponent },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ToolbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the GitHub link prompt when alias linking is enabled', () => {
    healthSubject.next({
      status: 'ok',
      info: {},
      error: {},
      details: { github: { status: 'up', alias: true } },
    });
    fixture.detectChanges();

    expect(openFromComponent).toHaveBeenCalled();
  });

  it('does not show the GitHub link prompt when alias linking is disabled', () => {
    expect(openFromComponent).not.toHaveBeenCalled();
  });
});
