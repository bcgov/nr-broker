import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteEdgeDialogComponent } from './delete-edge-dialog.component';

describe('DeleteEdgeDialogComponent', () => {
  let component: DeleteEdgeDialogComponent;
  let fixture: ComponentFixture<DeleteEdgeDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteEdgeDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DeleteEdgeDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
