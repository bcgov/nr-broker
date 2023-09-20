import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VertexFormFieldComponent } from './vertex-form-field.component';
import { FormGroup } from '@angular/forms';

describe('VertexFormFieldComponent', () => {
  let component: VertexFormFieldComponent;
  let fixture: ComponentFixture<VertexFormFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VertexFormFieldComponent],
      providers: [{ provide: FormGroup, useValue: new FormGroup([]) }],
    }).compileComponents();

    fixture = TestBed.createComponent(VertexFormFieldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
