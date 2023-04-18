import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { CollectionFieldConfigNameMapped } from '../graph.types';

@Component({
  selector: 'app-vertex-form-field',
  templateUrl: './vertex-form-field.component.html',
  styleUrls: ['./vertex-form-field.component.scss'],
})
export class VertexFormFieldComponent {
  @Input() field!: CollectionFieldConfigNameMapped;
  @Input() form!: FormGroup;
  @Output() onSubmit = new EventEmitter();

  get isValid() {
    return this.form.controls[this.field.name].valid;
  }
  get isDirty() {
    return this.form.controls[this.field.name].dirty;
  }
}
