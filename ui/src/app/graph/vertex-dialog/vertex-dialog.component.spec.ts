import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VertexDialogComponent } from './vertex-dialog.component';

describe('VertexDialogComponent', () => {
  let component: VertexDialogComponent;
  let fixture: ComponentFixture<VertexDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VertexDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VertexDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
