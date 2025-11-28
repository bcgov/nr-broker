import { Component, OnChanges, OnInit, output, input, inject, signal } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { CommonModule } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { CollectionConfigDto } from '../../service/persistence/dto/collection-config.dto';
import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';
import { EdgeDialogComponent } from '../edge-dialog/edge-dialog.component';
import { DeleteEdgeDialogComponent } from '../delete-edge-dialog/delete-edge-dialog.component';
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
import { CollectionUtilService } from '../../service/collection-util.service';
import { InspectorPeopleDialogComponent } from '../inspector-people-dialog/inspector-people-dialog.component';

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
  private readonly preferences = inject(PreferencesService);
  private readonly dialog = inject(MatDialog);
  private readonly colorUtil = inject(ColorUtilService);
  private readonly collectionUtil = inject(CollectionUtilService);
  readonly configRecord = inject<CollectionConfigNameRecord>(CONFIG_RECORD);

  readonly collection = input.required<CollectionNames>();
  readonly config = input.required<CollectionConfigDto>();
  readonly vertex = input.required<string>();
  readonly source = input.required<VertexDto>();
  readonly upstream = input.required<GraphDirectedCombo[]>();
  readonly downstream = input.required<GraphDirectedCombo[]>();
  readonly hasAdmin = input.required<boolean>();

  readonly selected = output<EdgeDto | VertexDto>();

  inboundConnections = signal<GraphDirectedComboMap>({});
  outboundConnections = signal<GraphDirectedComboMap>({});

  ngOnChanges(): void {
    this.outboundConnections.set(this.groupEdges(this.downstream()));
    this.inboundConnections.set(this.groupEdges(this.upstream()));
  }

  ngOnInit(): void {
    this.outboundConnections.set(this.groupEdges(this.downstream()));
    this.inboundConnections.set(this.groupEdges(this.upstream()));
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

  openCollectionConnections(connectedTableCollection: CollectionNames) {
    this.collectionUtil.openInBrowserByVertexId(this.collection(), this.vertex(), false, ['connections', { connectedTableCollection }]);
  }

  openUserRolesDialog() {
    this.dialog
      .open(InspectorPeopleDialogComponent, {
        closeOnNavigation: true,
        width: '640px',
        data: {
          collection: this.collection(),
          vertex: this.vertex(),
          showLinked: this.collection() === 'repository',
        },
      })
      .afterClosed()
      .subscribe();
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
