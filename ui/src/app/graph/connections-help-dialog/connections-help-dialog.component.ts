import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { NgStyle, TitleCasePipe } from '@angular/common';
import { CollectionEdgeConfig } from '../../service/persistence/dto/collection-config.dto';
import { ConnectionsHelpIntroComponent } from '../connections-help-intro/connections-help-intro.component';
import { CollectionConfigNameRecord } from '../../service/graph.types';
import { CONFIG_RECORD } from '../../app-initialize.factory';
import { ColorUtilService } from '../../util/color-util.service';
import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';

export interface OutboundEdgeInfo {
  targetCollectionName: string;
  edge: CollectionEdgeConfig;
}

export interface InboundEdgeInfo {
  sourceCollectionName: string;
  sourceCollection: CollectionNames;
  edge: CollectionEdgeConfig;
}

export interface ConnectionsHelpDialogData {
  outboundEdges: OutboundEdgeInfo[];
  inboundEdges: InboundEdgeInfo[];
  collectionName: string;
  navigationFollows: 'vertex' | 'edge';
}

@Component({
  selector: 'app-connections-help-dialog',
  imports: [
    MatDialogModule, MatButtonModule, MatChipsModule, MatDividerModule, MatIconModule,
    NgStyle, TitleCasePipe, ConnectionsHelpIntroComponent,
  ],
  templateUrl: './connections-help-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './connections-help-dialog.component.scss',
})
export class ConnectionsHelpDialogComponent {
  readonly data = inject<ConnectionsHelpDialogData>(MAT_DIALOG_DATA);
  readonly configRecord = inject<CollectionConfigNameRecord>(CONFIG_RECORD);
  private readonly colorUtil = inject(ColorUtilService);

  getVisibleTextColor(backgroundColor: string): string {
    return this.colorUtil.getSurfaceColor(backgroundColor);
  }
}
