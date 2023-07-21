import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EdgeDialogComponent } from './edge-dialog.component';

describe('EdgeDialogComponent', () => {
  let component: EdgeDialogComponent;
  let fixture: ComponentFixture<EdgeDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EdgeDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EdgeDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
