import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { JsonViewDialogComponent } from './json-view-dialog.component';

describe('JsonViewDialogComponent', () => {
  let component: JsonViewDialogComponent;
  let fixture: ComponentFixture<JsonViewDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JsonViewDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { json: {} } },
        { provide: MatDialogRef, useValue: { close: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(JsonViewDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
