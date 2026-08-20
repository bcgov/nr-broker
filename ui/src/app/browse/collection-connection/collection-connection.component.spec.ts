import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CONFIG_RECORD, INITIAL_PREFERENCES } from '../../app-initialize.factory';

import { CollectionConnectionComponent } from './collection-connection.component';

const mockPreferences: any = { browseCollectionDefault: 'project', browseConnectionFilter: 'connected', browseConnectionSize: 10, graphFollows: 'edge', graphHideRestricted: false, homeSectionTab: 0, ignoreGitHubLink: false, teamGroupBy: 'user' };
const mockConfig: any = { edges: [], color: '000000', name: 'test', fields: {}, permissions: { browse: false, create: false, filter: false, update: false, delete: false }, connectedTable: [] };
const mockConfigRecord: any = new Proxy({}, { get: () => mockConfig });

describe('CollectionConnectionComponent', () => {
  let component: CollectionConnectionComponent;
  let fixture: ComponentFixture<CollectionConnectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollectionConnectionComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CONFIG_RECORD, useValue: mockConfigRecord },
        { provide: INITIAL_PREFERENCES, useValue: mockPreferences },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CollectionConnectionComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('collection', 'service');
    fixture.componentRef.setInput('collectionId', '1');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
