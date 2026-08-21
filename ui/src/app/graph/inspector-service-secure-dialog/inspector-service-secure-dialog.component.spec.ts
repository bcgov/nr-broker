import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { InspectorServiceSecureDialogComponent } from './inspector-service-secure-dialog.component';

describe('InspectorServiceSecureDialogComponent', () => {
  let component: InspectorServiceSecureDialogComponent;
  let fixture: ComponentFixture<InspectorServiceSecureDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectorServiceSecureDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { role: { env: { title: 'Test' }, info: { kvUiPath: '', kvApiDataPath: '', kvApiMetaPath: '' } }, api: 'http://test' } },
        { provide: MatDialogRef, useValue: { close: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorServiceSecureDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
