import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CONFIG_ARR, CONFIG_RECORD, CURRENT_USER, INITIAL_PREFERENCES } from '../../app-initialize.factory';

import { InspectorComponent } from './inspector.component';

const mockPreferences: any = { browseCollectionDefault: 'project', browseConnectionFilter: 'connected', browseConnectionSize: 10, graphFollows: 'edge', graphHideRestricted: false, homeSectionTab: 0, ignoreGitHubLink: false, teamGroupBy: 'user' };
const mockConfig: any = { edges: [], color: '000000', name: 'test', fields: {}, browseFields: [], permissions: { browse: false, create: false, filter: false, update: false, delete: false } };
const mockConfigRecord: any = new Proxy({}, { get: () => mockConfig });

describe('InspectorComponent', () => {
  let component: InspectorComponent;
  let fixture: ComponentFixture<InspectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CONFIG_ARR, useValue: [] },
        { provide: CONFIG_RECORD, useValue: mockConfigRecord },
        { provide: CURRENT_USER, useValue: { domain: 'idir', email: 'test@example.com', guid: '1', name: 'Test', username: 'test', roles: [] } },
        { provide: INITIAL_PREFERENCES, useValue: mockPreferences },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
