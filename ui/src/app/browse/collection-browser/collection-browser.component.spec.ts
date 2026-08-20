import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CONFIG_ARR, CONFIG_RECORD, INITIAL_PREFERENCES } from '../../app-initialize.factory';

import { CollectionBrowserComponent } from './collection-browser.component';

const mockPreferences: any = { browseCollectionDefault: 'project', browseConnectionFilter: 'connected', browseConnectionSize: 10, graphFollows: 'edge', graphHideRestricted: false, homeSectionTab: 0, ignoreGitHubLink: false, teamGroupBy: 'user' };
const mockConfig: any = { edges: [], color: '000000', name: 'test', browseFields: [], fields: {}, collection: 'service', permissions: { browse: false, create: false, filter: false, update: false, delete: false }, fieldDefaultSort: { field: 'name', dir: 1 } };
const mockConfigRecord: any = new Proxy({}, { get: () => mockConfig });

describe('CollectionBrowserComponent', () => {
  let component: CollectionBrowserComponent;
  let fixture: ComponentFixture<CollectionBrowserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollectionBrowserComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CONFIG_ARR, useValue: [] },
        { provide: CONFIG_RECORD, useValue: mockConfigRecord },
        { provide: INITIAL_PREFERENCES, useValue: mockPreferences },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CollectionBrowserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
