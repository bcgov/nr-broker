import { Component, input, inject, computed } from '@angular/core';
import { CollectionConfigInstanceDto } from '../../service/persistence/dto/collection-config.dto';
import { GraphApiService } from '../../service/graph-api.service';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { TeamServiceRequestComponent } from '../../team/team-service-request/team-service-request.component';
import { httpResource } from '@angular/common/http';

@Component({
  selector: 'app-team-services',
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    TeamServiceRequestComponent,
  ],
  templateUrl: './team-services.component.html',
  styleUrl: './team-services.component.scss',
})
export class TeamServicesComponent {
  private readonly graphApi = inject(GraphApiService);

  readonly teamVertex = input.required<string>();

  propDisplayedColumns: string[] = ['key', 'value'];

  readonly servicesResource = httpResource<CollectionConfigInstanceDto[]>(() => {
    return this.graphApi.getEdgeConfigByVertexArgs(
      this.teamVertex(),
      'service',
      'uses',
    );
  });

  readonly activeServices = computed<CollectionConfigInstanceDto[]>(() => {
    const search = this.servicesResource.hasValue() ? this.servicesResource.value() : [];
    return search.filter((cci) => cci.instance);
  });
  readonly requestServices = computed<CollectionConfigInstanceDto[]>(() => {
    const search = this.servicesResource.hasValue() ? this.servicesResource.value() : [];
    return search.filter((cci) => !cci.instance);
  });
}
