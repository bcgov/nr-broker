import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VertexDialogEditorComponent } from './vertex-dialog-editor.component';

describe('VertexDialogEditorComponent', () => {
  let component: VertexDialogEditorComponent;
  let fixture: ComponentFixture<VertexDialogEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VertexDialogEditorComponent],
    })
      .compileComponents();

    fixture = TestBed.createComponent(VertexDialogEditorComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
