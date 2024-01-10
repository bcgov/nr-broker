import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ActivatedRoute, ParamMap, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { Observable, map, switchMap } from 'rxjs';
import { CURRENT_USER } from '../../app-initialize.factory';
import {
  ChartClickTargetVertex,
  CollectionConfigMap,
  UserDto,
} from '../../service/graph.types';
import { CollectionApiService } from '../../service/collection-api.service';
import { TeamRestDto } from '../../service/dto/team-rest.dto';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { GraphUtilService } from '../../service/graph-util.service';
import { BrokerAccountRestDto } from '../../service/dto/broker-account-rest.dto';
import { CollectionSearchResult } from '../../service/dto/collection-search-result.dto';
import { GraphApiService } from '../../service/graph-api.service';
import { InspectorVertexComponent } from '../../graph/inspector-vertex/inspector-vertex.component';
import { PreferencesService } from '../../preferences.service';
import { CollectionNameEnum } from '../../service/dto/collection-dto-union.type';

@Component({
  selector: 'app-team-viewer',
  standalone: true,
  imports: [
    CommonModule,
    InspectorVertexComponent,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    RouterModule,
  ],
  templateUrl: './team-viewer.component.html',
  styleUrl: './team-viewer.component.scss',
})
export class TeamViewerComponent {
  team$!: Observable<TeamRestDto>;
  latestConfig$!: Observable<CollectionConfigMap>;
  accountSearch$!: Observable<CollectionSearchResult<BrokerAccountRestDto>>;
  service: any;
  constructor(
    private route: ActivatedRoute,
    private readonly graphApi: GraphApiService,
    private readonly collectionApi: CollectionApiService,
    private readonly graphUtil: GraphUtilService,
    private readonly preferences: PreferencesService,
    @Inject(CURRENT_USER) public readonly user: UserDto,
  ) {}

  ngOnInit() {
    this.team$ = this.route.paramMap.pipe(
      switchMap((params: ParamMap) =>
        this.collectionApi.getCollectionById(
          'team',
          params.get('id') as string,
        ),
      ),
    );
    this.accountSearch$ = this.team$.pipe(
      switchMap((team: TeamRestDto) =>
        this.collectionApi.searchCollection('brokerAccount', team.vertex),
      ),
    );

    this.latestConfig$ = this.graphApi
      .getConfig()
      .pipe(map(this.graphUtil.configArrToMap));
  }

  openInGraph(elem: TeamRestDto) {
    this.graphUtil.openInGraph(elem.vertex, 'vertex');
  }

  makeTarget(account: BrokerAccountRestDto): ChartClickTargetVertex {
    return {
      type: 'vertex',
      data: {
        id: account.vertex,
        category: CollectionNameEnum.user,
        collection: 'brokerAccount',
        index: 0,
        name: account.name,
      },
    };
  }
}
