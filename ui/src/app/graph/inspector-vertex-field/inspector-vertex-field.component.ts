import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { CollectionFieldConfig } from '../../service/persistence/dto/collection-config.dto';

@Component({
  selector: 'app-inspector-vertex-field',
  imports: [DatePipe],
  templateUrl: './inspector-vertex-field.component.html',
  styleUrl: './inspector-vertex-field.component.scss',
})
export class InspectorVertexFieldComponent {
  public readonly config = input<CollectionFieldConfig>();
  public readonly value = input<any>();

  selectValueToLabel(value: any): string {
    if (value) {
      return (
        this.config()?.options?.find((option) => option.value === value)
          ?.label ?? value
      );
    }
    return '';
  }
}
