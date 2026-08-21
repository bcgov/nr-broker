import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CONFIG_RECORD } from '../../app-initialize.factory';

import { VertexDialogComponent } from './vertex-dialog.component';

const mockConfig: any = { edges: [], color: '000000', name: 'test', fields: {} };
const mockConfigRecord: any = new Proxy({}, { get: () => mockConfig });

describe('VertexDialogComponent', () => {
  let component: VertexDialogComponent;
  let fixture: ComponentFixture<VertexDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VertexDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: { collection: 'service' } },
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: CONFIG_RECORD, useValue: mockConfigRecord },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VertexDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
