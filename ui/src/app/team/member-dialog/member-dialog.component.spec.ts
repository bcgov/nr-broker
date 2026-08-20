import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CURRENT_USER, CONFIG_RECORD, SYNC_QUEUE_CONFIG_RECORD, INITIAL_PREFERENCES } from '../../app-initialize.factory';

import { MemberDialogComponent } from './member-dialog.component';

const mockConfig: any = { edges: [], color: '000000', name: 'test' };
const mockConfigRecord: any = new Proxy({}, { get: () => mockConfig });

describe('MemberDialogComponent', () => {
  let component: MemberDialogComponent;
  let fixture: ComponentFixture<MemberDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: { vertex: '1', name: 'Test' } },
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: CURRENT_USER, useValue: { domain: 'idir', email: 'test@example.com', guid: '1', name: 'Test', username: 'test', roles: [] } },
        { provide: CONFIG_RECORD, useValue: mockConfigRecord },
        { provide: SYNC_QUEUE_CONFIG_RECORD, useValue: {} },
        { provide: INITIAL_PREFERENCES, useValue: { browseCollectionDefault: 'project', browseConnectionFilter: 'connected', browseConnectionSize: 10, graphFollows: 'edge', graphHideRestricted: false, homeSectionTab: 0, ignoreGitHubLink: false, teamGroupBy: 'user' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MemberDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
