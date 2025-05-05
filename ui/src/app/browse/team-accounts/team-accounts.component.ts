import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CollectionApiService } from '../../service/collection-api.service';
import { CollectionSearchResult } from '../../service/collection/dto/collection-search-result.dto';
import { BrokerAccountDto } from '../../service/persistence/dto/broker-account.dto';
import { CollectionConfigDto } from '../../service/persistence/dto/collection-config.dto';
import { InspectorVertexComponent } from '../../graph/inspector-vertex/inspector-vertex.component';
import { GraphUtilService } from '../../service/graph-util.service';
import { CollectionUtilService } from '../../service/collection-util.service';

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
    private readonly collectionUtil: CollectionUtilService,
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

  ngOnChanges(changes: SimpleChanges) {
    if (changes['teamVertex']) {
      this.ngOnInit();
    }
  }

  openInBrowser(elem: BrokerAccountDto) {
    this.collectionUtil.openInBrowser('brokerAccount', elem.id);
  }

  openInGraph(elem: BrokerAccountDto) {
    this.graphUtil.openInGraph(elem.vertex, 'vertex');
  }
}
