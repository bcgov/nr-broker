import {
  Component,
  EventEmitter,
  Inject,
  OnChanges,
  OnInit,
  Output,
  input,
} from '@angular/core';
import { CollectionConfigDto } from '../../service/persistence/dto/collection-config.dto';
import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';
import { EdgeDialogComponent } from '../edge-dialog/edge-dialog.component';
import { DeleteEdgeDialogComponent } from '../delete-edge-dialog/delete-edge-dialog.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { CommonModule } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { EdgeDto } from '../../service/persistence/dto/edge.dto';
import { PreferencesService } from '../../preferences.service';
import {
  GraphDirectedCombo,
  GraphDirectedComboMap,
} from '../../service/persistence/dto/collection-combo.dto';
import { VertexDto } from '../../service/persistence/dto/vertex.dto';
import { CollectionConfigNameRecord } from '../../service/graph.types';
import { CONFIG_RECORD } from '../../app-initialize.factory';
import { ColorUtilService } from '../../util/color-util.service';

@Component({
  selector: 'app-inspector-connections',
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
  readonly collection = input.required<CollectionNames>();
  readonly config = input.required<CollectionConfigDto>();
  readonly vertex = input.required<string>();
  readonly source = input.required<VertexDto>();
  readonly upstream = input.required<GraphDirectedCombo[]>();
  readonly downstream = input.required<GraphDirectedCombo[]>();
  readonly hasAdmin = input.required<boolean>();

  @Output() selected = new EventEmitter<EdgeDto | VertexDto>();

  inboundConnections: GraphDirectedComboMap = {};
  outboundConnections: GraphDirectedComboMap = {};

  constructor(
    private readonly preferences: PreferencesService,
    private readonly dialog: MatDialog,
    private readonly colorUtil: ColorUtilService,
    @Inject(CONFIG_RECORD)
    public readonly configRecord: CollectionConfigNameRecord,
  ) {}

  ngOnChanges(): void {
    this.outboundConnections = this.groupEdges(this.downstream());
    this.inboundConnections = this.groupEdges(this.upstream());
  }

  ngOnInit(): void {
    this.outboundConnections = this.groupEdges(this.downstream());
    this.inboundConnections = this.groupEdges(this.upstream());
  }

  private groupEdges(comboArr: GraphDirectedCombo[]): GraphDirectedComboMap {
    const map: GraphDirectedComboMap = {};
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
          collection: this.collection(),
          source: this.source(),
          vertex: {
            id: this.vertex(),
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

  openDeleteEdgeDialog(connections: GraphDirectedComboMap) {
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

  navigateConnection($event: MouseEvent, item: GraphDirectedCombo) {
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
