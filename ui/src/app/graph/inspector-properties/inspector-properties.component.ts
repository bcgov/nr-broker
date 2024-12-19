import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { VertexPropDto } from '../../service/persistence/dto/vertex.dto';
import { EdgePropDto } from '../../service/persistence/dto/edge-prop.dto';

@Component({
    selector: 'app-inspector-properties',
    imports: [CommonModule, MatTableModule],
    templateUrl: './inspector-properties.component.html',
    styleUrl: './inspector-properties.component.scss'
})
export class InspectorPropertiesComponent {
  @Input() prop!: VertexPropDto | EdgePropDto;
  @Input() showHeader = true;
  propDisplayedColumns: string[] = ['key', 'value'];
}
