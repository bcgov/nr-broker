import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { ConnectionConfigDto } from '../../service/persistence/dto/connection-config.dto';

@Component({
  selector: 'app-external-service-card',
  imports: [MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './external-service-card.component.html',
  styleUrl: './external-service-card.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class ExternalServiceCardComponent {
  readonly connectionConfig = input<ConnectionConfigDto | null>(null);

  getServiceIcon(): string {
    return this.connectionConfig()?.imageEmbedded || this.connectionConfig()?.imageUrl || 'assets/broker-bw.svg';
  }
}