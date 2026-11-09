import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { empty } from 'rxjs';
import { SseClient } from 'ngx-sse-client';
import { INITIAL_PREFERENCES } from '../app-initialize.factory';

import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SseClient, useValue: { stream: () => empty() } },
        { provide: INITIAL_PREFERENCES, useValue: { browseCollectionDefault: 'project', browseConnectionFilter: 'connected', browseConnectionSize: 10, graphFollows: 'edge', graphHideRestricted: false, homeSectionTab: 0, ignoreGitHubLink: false, teamGroupBy: 'user' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    const controller = TestBed.inject(HttpTestingController);
    controller.match((req) => req.url.includes('/v1/intention/stats')).forEach(
      (req) =>
        req.flush({
          totalSuccesses: 0,
          totalClosed: 0,
          successRate: 0,
          successesToday: 0,
          byAction: {},
          byAccount: [],
          recent: [],
        }),
    );
    controller
      .match((req) => req.url.includes('/v1/system/preference/connection'))
      .forEach((req) => req.flush([]));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
