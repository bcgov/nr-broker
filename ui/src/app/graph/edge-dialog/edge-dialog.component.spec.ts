import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CONFIG_RECORD } from '../../app-initialize.factory';

import { EdgeDialogComponent } from './edge-dialog.component';

const mockConfig: any = { edges: [], color: '000000', name: 'test' };
const mockConfigRecord: any = new Proxy({}, { get: () => mockConfig });

describe('EdgeDialogComponent', () => {
  let component: EdgeDialogComponent;
  let fixture: ComponentFixture<EdgeDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EdgeDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: { collection: 'service', source: { id: '1', collection: 'project' } } },
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: CONFIG_RECORD, useValue: mockConfigRecord },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EdgeDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
