import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { VaultDialogComponent } from './vault-dialog.component';

describe('VaultDialogComponent', () => {
  let component: VaultDialogComponent;
  let fixture: ComponentFixture<VaultDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VaultDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: { service: { id: '1' }, showMasked: false } },
        { provide: MatDialogRef, useValue: { close: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VaultDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
