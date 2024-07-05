import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, ParamMap, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, combineLatest, map, mergeMap, switchMap, tap } from 'rxjs';

import { CURRENT_USER } from '../../app-initialize.factory';
import { UserDto } from '../../service/graph.types';
import { CollectionApiService } from '../../service/collection-api.service';
import { TeamRestDto } from '../../service/dto/team-rest.dto';
import { GraphUtilService } from '../../service/graph-util.service';
import { BrokerAccountRestDto } from '../../service/dto/broker-account-rest.dto';
import { CollectionSearchResult } from '../../service/dto/collection-search-result.dto';
import { GraphApiService } from '../../service/graph-api.service';
import { InspectorVertexComponent } from '../../graph/inspector-vertex/inspector-vertex.component';
import {
  CollectionConfigInstanceRestDto,
  CollectionConfigRestDto,
} from '../../service/dto/collection-config-rest.dto';
import { TeamServiceRequestComponent } from '../team-service-request/team-service-request.component';
import { UserPermissionRestDto } from '../../service/dto/user-permission-rest.dto';
import { PermissionService } from '../../service/permission.service';

@Component({
  selector: 'app-team-viewer',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    RouterModule,
    InspectorVertexComponent,
    TeamServiceRequestComponent,
  ],
  templateUrl: './team-viewer.component.html',
  styleUrl: './team-viewer.component.scss',
})
export class TeamViewerComponent {
  data$!: Observable<{
    accountSearch: CollectionSearchResult<BrokerAccountRestDto>;
    config: CollectionConfigRestDto;
    permissions: UserPermissionRestDto;
    serviceSearch: CollectionConfigInstanceRestDto[];
    team: TeamRestDto;
  }>;
  service: any;
  propDisplayedColumns: string[] = ['key', 'value'];
  serviceCount = 0;

  constructor(
    public readonly permission: PermissionService,
    private route: ActivatedRoute,
    private readonly graphApi: GraphApiService,
    private readonly collectionApi: CollectionApiService,
    private readonly graphUtil: GraphUtilService,
    @Inject(CURRENT_USER) public readonly user: UserDto,
  ) {}

  ngOnInit() {
    this.data$ = combineLatest({
      team: this.route.paramMap.pipe(
        switchMap((params: ParamMap) =>
          this.collectionApi.getCollectionById(
            'team',
            params.get('id') as string,
          ),
        ),
      ),
      permissions: this.graphApi.getUserPermissions(),
      config: this.graphApi.getCollectionConfig('team'),
    }).pipe(
      mergeMap((data: any) => {
        return combineLatest({
          accountSearch: this.collectionApi.searchCollection('brokerAccount', {
            upstreamVertex: data.team.vertex,
            offset: 0,
            limit: 20,
          }),
          serviceSearch: this.graphApi.getEdgeConfigByVertex(
            data.team.vertex,
            'service',
            'uses',
          ),
        }).pipe(
          tap((search) => {
            this.serviceCount = search.serviceSearch.filter(
              (cci) => cci.instance,
            ).length;
          }),
          map((search) => ({ ...search, ...data })),
        );
      }),
    );
  }

  openInGraph(elem: TeamRestDto) {
    this.graphUtil.openInGraph(elem.vertex, 'vertex');
  }
}
