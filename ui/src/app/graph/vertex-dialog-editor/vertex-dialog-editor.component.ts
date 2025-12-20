import { Component, input, output, viewChild } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';

import { VertexFormBuilderComponent } from '../vertex-form-builder/vertex-form-builder.component';
import { PropertyEditorComponent } from '../property-editor/property-editor.component';
import { CollectionFieldConfigMap } from '../../service/persistence/dto/collection-config.dto';
import { VertexPropDto } from '../../service/persistence/dto/vertex.dto';
import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';

@Component({
  selector: 'app-vertex-dialog-editor',
  imports: [
    MatDividerModule,
    VertexFormBuilderComponent,
    PropertyEditorComponent,
  ],
  templateUrl: './vertex-dialog-editor.component.html',
  styleUrl: './vertex-dialog-editor.component.scss',
})
export class VertexDialogEditorComponent {
  readonly collection = input.required<CollectionNames>();
  readonly fieldMap = input.required<CollectionFieldConfigMap>();
  readonly data = input<any>();
  readonly graphProperties = input<VertexPropDto>();

  readonly formSubmitted = output<void>();
  readonly isFormValid = output<boolean>();

  readonly formComponent = viewChild.required(VertexFormBuilderComponent);
  readonly propertyEditorComponent = viewChild.required(PropertyEditorComponent);

  getFormValue() {
    return this.formComponent().form.value;
  }

  getPropertyValues() {
    return this.propertyEditorComponent().getPropertyValues();
  }
}
