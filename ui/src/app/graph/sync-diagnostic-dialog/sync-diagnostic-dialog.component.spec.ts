import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { SyncDiagnosticDialogComponent } from './sync-diagnostic-dialog.component';

describe('SyncDiagnosticDialogComponent', () => {
  let component: SyncDiagnosticDialogComponent;
  let fixture: ComponentFixture<SyncDiagnosticDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SyncDiagnosticDialogComponent],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            label: 'GitHub Sync',
            queue: 'github-sync',
            summary: 'Sync GitHub catalog',
            source: 'queue',
            targetCount: 3,
          },
        },
        { provide: MatDialogRef, useValue: { close: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SyncDiagnosticDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should summarize multiple targets', () => {
    expect(component.targetSummary).toContain('3 targets found');
  });

  it('should summarize a single target', () => {
    component.data.targetCount = 1;
    expect(component.targetSummary).toContain('1 target found');
  });

  it('should report no targets found', () => {
    component.data.targetCount = 0;
    expect(component.targetSummary).toContain('No targets found');
  });
});
