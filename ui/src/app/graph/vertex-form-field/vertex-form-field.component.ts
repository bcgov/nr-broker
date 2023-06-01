import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TextFieldModule } from '@angular/cdk/text-field';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgSwitch, NgSwitchCase, NgIf } from '@angular/common';
import { CollectionFieldConfigNameMapped } from '../../service/graph.types';

@Component({
  selector: 'app-vertex-form-field',
  templateUrl: './vertex-form-field.component.html',
  styleUrls: ['./vertex-form-field.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    NgSwitch,
    NgSwitchCase,
    MatFormFieldModule,
    NgIf,
    MatInputModule,
    TextFieldModule,
  ],
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
