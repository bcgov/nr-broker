import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CURRENT_USER, CONFIG_RECORD } from '../../app-initialize.factory';

import { AddTeamDialogComponent } from './add-team-dialog.component';

const mockConfig: any = { edges: [], color: '000000', name: 'test', fields: {}, permissions: { browse: false, create: false, filter: false, update: false, delete: false } };
const mockConfigRecord: any = new Proxy({}, { get: () => mockConfig });

describe('AddTeamDialogComponent', () => {
  let component: AddTeamDialogComponent;
  let fixture: ComponentFixture<AddTeamDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddTeamDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: { configMap: {}, collection: 'team' } },
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: CURRENT_USER, useValue: { domain: 'idir', email: 'test@example.com', guid: '1', name: 'Test', username: 'test', roles: [] } },
        { provide: CONFIG_RECORD, useValue: mockConfigRecord },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddTeamDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
