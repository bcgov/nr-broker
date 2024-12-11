import { Component, EventEmitter, Inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { CollectionConfigMap } from '../../service/graph.types';
import { VertexNameComponent } from '../vertex-name/vertex-name.component';
import { VertexDto } from '../../service/dto/vertex.dto';
import { CONFIG_MAP } from '../../app-initialize.factory';
import { EdgeDto } from '../../service/dto/edge.dto';

@Component({
    selector: 'app-inspector-edge',
    imports: [
        CommonModule,
        ClipboardModule,
        MatButtonModule,
        MatChipsModule,
        MatIconModule,
        VertexNameComponent,
    ],
    templateUrl: './inspector-edge.component.html',
    styleUrl: './inspector-edge.component.scss'
})
export class InspectorEdgeComponent {
  @Input() edge!: EdgeDto;
  @Input() sourceVertex!: VertexDto | any;
  @Input() targetVertex!: VertexDto | any;
  @Output() vertexSelected = new EventEmitter<string>();

  constructor(
    @Inject(CONFIG_MAP) public readonly configMap: CollectionConfigMap,
  ) {}
}
