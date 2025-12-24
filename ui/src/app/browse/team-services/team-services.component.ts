import { Component, input, inject, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { httpResource } from '@angular/common/http';

import { CollectionConfigInstanceDto } from '../../service/persistence/dto/collection-config.dto';
import { GraphApiService } from '../../service/graph-api.service';
import { TeamServiceRequestComponent } from '../../team/team-service-request/team-service-request.component';
import { TeamServiceComponent } from '../team-service/team-service.component';
import { UserPermissionDto } from '../../service/persistence/dto/user-permission.dto';

@Component({
  selector: 'app-team-services',
  imports: [
    CommonModule,
    TeamServiceComponent,
    TeamServiceRequestComponent,
  ],
  templateUrl: './team-services.component.html',
  styleUrl: './team-services.component.scss',
})
export class TeamServicesComponent {
  private readonly graphApi = inject(GraphApiService);

  readonly showHelp = input<boolean>(false);
  readonly teamVertex = input.required<string>();
  readonly userPermissions = input.required<UserPermissionDto>();
  readonly refresh = output<void>();

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
