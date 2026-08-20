import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { GraphPropViewerDialogComponent } from './graph-prop-viewer-dialog.component';

describe('GraphPropViewerDialogComponent', () => {
  let component: GraphPropViewerDialogComponent;
  let fixture: ComponentFixture<GraphPropViewerDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraphPropViewerDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { json: {} } },
        { provide: MatDialogRef, useValue: { close: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GraphPropViewerDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
