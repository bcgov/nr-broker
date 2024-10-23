import {
  Component,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  OnInit,
  Output,
} from '@angular/core';
import { CollectionConfigRestDto } from '../../service/dto/collection-config-rest.dto';
import { CollectionNames } from '../../service/dto/collection-dto-union.type';
import { EdgeDialogComponent } from '../edge-dialog/edge-dialog.component';
import { DeleteEdgeDialogComponent } from '../delete-edge-dialog/delete-edge-dialog.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { CommonModule } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { EdgeRestDto } from '../../service/dto/edge-rest.dto';
import { PreferencesService } from '../../preferences.service';
import {
  GraphDirectedRestCombo,
  GraphDirectedRestComboMap,
} from '../../service/dto/collection-combo-rest.dto';
import { VertexRestDto } from '../../service/dto/vertex-rest.dto';
import { CollectionConfigMap } from '../../service/graph.types';
import { CONFIG_MAP } from '../../app-initialize.factory';
import { ColorUtilService } from '../../util/color-util.service';

@Component({
  selector: 'app-inspector-connections',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatChipsModule,
    MatDialogModule,
    MatDividerModule,
  ],
  templateUrl: './inspector-connections.component.html',
  styleUrl: './inspector-connections.component.scss',
})
export class InspectorConnectionsComponent implements OnInit, OnChanges {
  @Input() collection!: CollectionNames;
  @Input() config!: CollectionConfigRestDto;
  @Input() vertex!: string;
  @Input() source!: VertexRestDto;
  @Input() upstream!: GraphDirectedRestCombo[];
  @Input() downstream!: GraphDirectedRestCombo[];
  @Input() hasAdmin!: boolean;

  @Output() selected = new EventEmitter<EdgeRestDto | VertexRestDto>();

  inboundConnections: GraphDirectedRestComboMap = {};
  outboundConnections: GraphDirectedRestComboMap = {};

  constructor(
    private readonly preferences: PreferencesService,
    private readonly dialog: MatDialog,
    private readonly colorUtil: ColorUtilService,
    @Inject(CONFIG_MAP) public readonly configMap: CollectionConfigMap,
  ) {}

  ngOnChanges(): void {
    this.outboundConnections = this.groupEdges(this.downstream);
    this.inboundConnections = this.groupEdges(this.upstream);
  }

  ngOnInit(): void {
    this.outboundConnections = this.groupEdges(this.downstream);
    this.inboundConnections = this.groupEdges(this.upstream);
  }

  private groupEdges(
    comboArr: GraphDirectedRestCombo[],
  ): GraphDirectedRestComboMap {
    const map: GraphDirectedRestComboMap = {};
    for (const combo of comboArr) {
      if (!map[combo.edge.name]) {
        map[combo.edge.name] = [];
      }
      map[combo.edge.name].push(combo);
    }
    return map;
  }

  addEdgeToVertex() {
    this.dialog
      .open(EdgeDialogComponent, {
        width: '500px',
        data: {
          collection: this.collection,
          source: this.source,
          vertex: {
            id: this.vertex,
          },
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (result && result.refresh) {
          // this.refreshData();
        }
      });
  }

  openDeleteEdgeDialog(connections: GraphDirectedRestComboMap) {
    this.dialog
      .open(DeleteEdgeDialogComponent, {
        width: '500px',
        data: {
          connections,
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (result && result.refresh) {
          // this.refreshData();
        }
      });
  }

  navigateConnection($event: MouseEvent, item: GraphDirectedRestCombo) {
    const isEdgeNav = this.preferences.get('graphFollows') === 'edge';
    if ($event.altKey ? !isEdgeNav : isEdgeNav) {
      this.selected.emit(item.edge);
    } else {
      this.selected.emit(item.vertex);
    }
  }

  getVisibleTextColor(backgroundColor: string) {
    return this.colorUtil.calculateLuminance(
      this.colorUtil.hexToRgb(backgroundColor),
    ) > 0.5
      ? '#000000'
      : '#FFFFFF';
  }
}
