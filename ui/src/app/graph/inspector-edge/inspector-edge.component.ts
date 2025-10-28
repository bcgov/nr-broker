import { Component, EventEmitter, Input, Output, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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
    CommonModule,
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
  // TODO: Skipped for migration because:
  //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
  //  and migrating would break narrowing currently.
  @Input() sourceVertex!: VertexDto;
  // TODO: Skipped for migration because:
  //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
  //  and migrating would break narrowing currently.
  @Input() targetVertex!: VertexDto;
  @Output() vertexSelected = new EventEmitter<string>();
}
