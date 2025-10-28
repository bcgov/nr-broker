import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, input } from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TextFieldModule } from '@angular/cdk/text-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';

import { CollectionFieldConfigNameMapped } from '../../service/graph.types';

@Component({
  selector: 'app-vertex-form-field',
  templateUrl: './vertex-form-field.component.html',
  styleUrls: ['./vertex-form-field.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    TextFieldModule,
  ],
})
export class VertexFormFieldComponent {
  // TODO: Skipped for migration because:
  //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
  //  and migrating would break narrowing currently.
  @Input() field!: CollectionFieldConfigNameMapped;
  readonly form = input.required<FormGroup>();
  @Output() formSubmitted = new EventEmitter();

  get isValid() {
    return this.form().controls[this.field.name].valid;
  }
  get isDirty() {
    return this.form().controls[this.field.name].dirty;
  }
}
