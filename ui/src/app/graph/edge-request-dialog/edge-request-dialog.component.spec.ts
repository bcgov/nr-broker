import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EdgeRequestDialogComponent } from './edge-request-dialog.component';

describe('EdgeRequestDialogComponent', () => {
  let component: EdgeRequestDialogComponent;
  let fixture: ComponentFixture<EdgeRequestDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EdgeRequestDialogComponent],
    })
      .compileComponents();

    fixture = TestBed.createComponent(EdgeRequestDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
