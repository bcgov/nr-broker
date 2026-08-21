import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CONFIG_RECORD } from '../../app-initialize.factory';

import { InspectorPeopleDialogComponent } from './inspector-people-dialog.component';

const mockConfig: any = { edges: [], color: '000000', name: 'test' };
const mockConfigRecord: any = new Proxy({}, { get: () => mockConfig });

describe('InspectorPeopleDialogComponent', () => {
  let component: InspectorPeopleDialogComponent;
  let fixture: ComponentFixture<InspectorPeopleDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorPeopleDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: { collection: 'user', name: 'test', vertex: '1' } },
        { provide: CONFIG_RECORD, useValue: mockConfigRecord },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorPeopleDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
