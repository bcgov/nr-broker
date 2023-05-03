import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VertexFormFieldComponent } from './vertex-form-field.component';

describe('VertexFormFieldComponent', () => {
  let component: VertexFormFieldComponent;
  let fixture: ComponentFixture<VertexFormFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [VertexFormFieldComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(VertexFormFieldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
