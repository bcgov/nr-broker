import { Component, Input, OnInit } from '@angular/core';
import { CollectionApiService } from '../../service/collection-api.service';
import { CollectionSearchResult } from '../../service/collection/dto/collection-search-result.dto';
import { BrokerAccountDto } from '../../service/persistence/dto/broker-account.dto';
import { CommonModule } from '@angular/common';
import { CollectionConfigDto } from '../../service/persistence/dto/collection-config.dto';
import { InspectorVertexComponent } from '../../graph/inspector-vertex/inspector-vertex.component';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TeamDto } from '../../service/persistence/dto/team.dto';
import { GraphUtilService } from '../../service/graph-util.service';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-team-accounts',
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    InspectorVertexComponent,
  ],
  templateUrl: './team-accounts.component.html',
  styleUrl: './team-accounts.component.scss',
})
export class TeamAccountsComponent implements OnInit {
  @Input() teamVertex!: string;
  @Input() hasSudo!: boolean;
  @Input() hasUpdate!: boolean;
  @Input() config!: CollectionConfigDto;

  accountSearch: CollectionSearchResult<BrokerAccountDto> = {
    data: [],
    meta: {
      total: 0,
    },
  };

  constructor(
    private readonly collectionApi: CollectionApiService,
    private readonly graphUtil: GraphUtilService,
  ) {}

  ngOnInit() {
    this.collectionApi
      .searchCollection('brokerAccount', {
        upstreamVertex: this.teamVertex,
        offset: 0,
        limit: 20,
      })
      .subscribe((search) => {
        this.accountSearch = search;
      });
  }

  openInGraph(elem: TeamDto) {
    this.graphUtil.openInGraph(elem.vertex, 'vertex');
  }
}
