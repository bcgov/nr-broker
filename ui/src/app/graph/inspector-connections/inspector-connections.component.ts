import { Component, computed, output, input, inject } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { CommonModule } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { ConnectedTableOptions } from '../../service/persistence/dto/collection-config.dto';
import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';
import { EdgeDialogComponent } from '../edge-dialog/edge-dialog.component';
import { DeleteEdgeDialogComponent } from '../delete-edge-dialog/delete-edge-dialog.component';
import { EdgeDto } from '../../service/persistence/dto/edge.dto';
import { GraphDirectedComboMap } from '../../service/persistence/dto/collection-combo.dto';
import { VertexDto } from '../../service/persistence/dto/vertex.dto';
import { CollectionConfigNameRecord } from '../../service/graph.types';
import { CONFIG_RECORD } from '../../app-initialize.factory';
import { ColorUtilService } from '../../util/color-util.service';
import { CollectionUtilService } from '../../service/collection-util.service';
import { InspectorPeopleDialogComponent } from '../inspector-people-dialog/inspector-people-dialog.component';
import { InspectorConnectionsDirectionComponent } from '../inspector-connections-direction/inspector-connections-direction.component';
import { CollectionCombo } from '../../service/collection/dto/collection-search-result.dto';

@Component({
  selector: 'app-inspector-connections',
  imports: [
    CommonModule,
    MatButtonModule,
    MatChipsModule,
    MatDialogModule,
    MatDividerModule,
    InspectorConnectionsDirectionComponent,
  ],
  templateUrl: './inspector-connections.component.html',
  styleUrl: './inspector-connections.component.scss',
})
export class InspectorConnectionsComponent {
  private readonly dialog = inject(MatDialog);
  private readonly colorUtil = inject(ColorUtilService);
  private readonly collectionUtil = inject(CollectionUtilService);
  readonly configRecord = inject<CollectionConfigNameRecord>(CONFIG_RECORD);

  readonly comboData = input.required<CollectionCombo<any>>();
  readonly hasAdmin = input.required<boolean>();
  readonly hideRestricted = input<boolean>(true);

  readonly selected = output<EdgeDto | VertexDto>();

  readonly collection = computed(() => this.comboData().vertex.collection);
  readonly config = computed(() => this.configRecord[this.collection()]);
  readonly vertex = computed(() => this.comboData().collection.vertex);
  readonly source = computed(() => this.comboData().vertex);
  readonly upstream = computed(() => this.comboData().upstream);
  readonly downstream = computed(() => this.comboData().downstream);

  connectedTable = computed<ConnectedTableOptions[]>(() => {
    return this.collectionUtil.computeConnectedTables(this.collection(),
      [
        ...(this.upstream().map((combo) => ({
          collection: combo.vertex.collection,
          restrict: !!combo.edge.restrict,
          direction: 'upstream' as const,
        })) || []),
        ...(this.downstream().map((combo) => ({
          collection: combo.vertex.collection,
          restrict: !!combo.edge.restrict,
          direction: 'downstream' as const,
        })) || []),
      ]);
  });

  openCollectionConnections(connectedTableCollection: CollectionNames, connectedTableDirection: 'upstream' | 'downstream', includeRestricted: boolean) {
    this.collectionUtil.openInBrowserByVertexId(
      this.collection(), this.vertex(), false, ['connections',
        { connectedTableCollection, connectedTableDirection, includeRestricted },
      ],
    );
  }

  openUserRolesDialog() {
    this.dialog
      .open(InspectorPeopleDialogComponent, {
        closeOnNavigation: true,
        width: '640px',
        data: {
          collection: this.collection(),
          vertex: this.vertex(),
          name: this.comboData().vertex.name,
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

  getVisibleTextColor(backgroundColor: string) {
    return this.colorUtil.calculateLuminance(
      this.colorUtil.hexToRgb(backgroundColor),
    ) > 0.5
      ? '#000000'
      : '#FFFFFF';
  }
}
