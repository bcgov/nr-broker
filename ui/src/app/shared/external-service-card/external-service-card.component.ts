import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { CollectionUtilService } from '../../service/collection-util.service';
import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';
import { ConnectionConfigDto } from '../../service/persistence/dto/connection-config.dto';
import { GraphUtilService } from '../../service/graph-util.service';

@Component({
  selector: 'app-external-service-card',
  imports: [MatButtonModule, MatCardModule, MatIconModule, MatTooltipModule],
  templateUrl: './external-service-card.component.html',
  styleUrl: './external-service-card.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class ExternalServiceCardComponent {
  readonly connectionConfig = input<ConnectionConfigDto | null>(null);

  private readonly graphUtil = inject(GraphUtilService);
  private readonly collectionUtil = inject(CollectionUtilService);

  getServiceIcon(): string {
    return this.connectionConfig()?.imageEmbedded || this.connectionConfig()?.imageUrl || 'assets/broker-bw.svg';
  }

  openInBrowser(): void {
    const vertexId = this.connectionConfig()?.vertexId;
    const collection = this.connectionConfig()?.collection as CollectionNames | undefined;
    if (vertexId && collection) {
      this.collectionUtil.openInBrowserByVertexId(collection, vertexId);
    }
  }

  openInGraph(): void {
    const vertexId = this.connectionConfig()?.vertexId;
    if (vertexId) {
      this.graphUtil.openInGraph(vertexId, 'vertex', false);
    }
  }
}
