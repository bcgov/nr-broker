import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddEdgeDialogComponent } from './add-edge-dialog.component';

describe('AddEdgeDialogComponent', () => {
  let component: AddEdgeDialogComponent;
  let fixture: ComponentFixture<AddEdgeDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [AddEdgeDialogComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(AddEdgeDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
