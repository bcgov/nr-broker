import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TitleCasePipe } from '@angular/common';
import { CollectionEdgeConfig } from '../../service/persistence/dto/collection-config.dto';
import { ConnectionsHelpIntroComponent } from '../connections-help-intro/connections-help-intro.component';

export interface OutboundEdgeInfo {
  targetCollectionName: string;
  edge: CollectionEdgeConfig;
}

export interface InboundEdgeInfo {
  sourceCollectionName: string;
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
    MatDialogModule, MatButtonModule, MatChipsModule, MatDividerModule, MatIconModule, MatTooltipModule,
    TitleCasePipe, ConnectionsHelpIntroComponent,
  ],
  templateUrl: './connections-help-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './connections-help-dialog.component.scss',
})
export class ConnectionsHelpDialogComponent {
  readonly data = inject<ConnectionsHelpDialogData>(MAT_DIALOG_DATA);
}
