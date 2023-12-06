import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import {
  ChartClickTargetEdge,
  CollectionConfigMap,
  EdgeNavigation,
  GraphData,
} from '../../service/graph.types';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { VertexNameComponent } from '../vertex-name/vertex-name.component';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-inspector-edge',
  standalone: true,
  imports: [
    ClipboardModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    VertexNameComponent,
  ],
  templateUrl: './inspector-edge.component.html',
  styleUrl: './inspector-edge.component.scss',
})
export class InspectorEdgeComponent implements OnInit {
  @Input() target!: ChartClickTargetEdge;
  @Input() graphData!: GraphData;
  @Input() collectionConfig!: CollectionConfigMap;
  @Output() vertexSelected = new EventEmitter<string>();
  edgeConnections!: EdgeNavigation;

  ngOnInit() {
    this.edgeConnections = {
      edge: this.target.data,
      sourceVertex: this.graphData.idToVertex[this.target.data.source],
      targetVertex: this.graphData.idToVertex[this.target.data.target],
    };
  }
}
