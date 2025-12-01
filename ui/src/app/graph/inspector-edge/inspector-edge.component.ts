import { Component, input, inject, output } from '@angular/core';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { CollectionConfigNameRecord } from '../../service/graph.types';
import { VertexNameComponent } from '../vertex-name/vertex-name.component';
import { VertexDto } from '../../service/persistence/dto/vertex.dto';
import { CONFIG_RECORD } from '../../app-initialize.factory';
import { EdgeDto } from '../../service/persistence/dto/edge.dto';

@Component({
  selector: 'app-inspector-edge',
  imports: [
    ClipboardModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatTooltipModule,
    VertexNameComponent,
  ],
  templateUrl: './inspector-edge.component.html',
  styleUrl: './inspector-edge.component.scss',
})
export class InspectorEdgeComponent {
  readonly configRecord = inject<CollectionConfigNameRecord>(CONFIG_RECORD);

  readonly edge = input.required<EdgeDto>();
  readonly sourceVertex = input.required<VertexDto>();
  readonly targetVertex = input.required<VertexDto>();
  readonly vertexSelected = output<string>();
}
