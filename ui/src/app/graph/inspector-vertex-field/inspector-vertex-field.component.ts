import { DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CollectionFieldConfig } from '../../service/dto/collection-config.dto';

@Component({
    selector: 'app-inspector-vertex-field',
    imports: [DatePipe],
    templateUrl: './inspector-vertex-field.component.html',
    styleUrl: './inspector-vertex-field.component.scss'
})
export class InspectorVertexFieldComponent {
  @Input() public config: CollectionFieldConfig | undefined;
  @Input() public value: any;
}
