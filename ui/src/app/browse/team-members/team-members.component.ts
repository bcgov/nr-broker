import {
  Component,
  Inject,
  OnChanges,
  OnDestroy,
  OnInit,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatListModule } from '@angular/material/list';
import { Subject, switchMap } from 'rxjs';

import { GraphDirectedCombo } from '../../service/persistence/dto/collection-combo.dto';
import { CONFIG_RECORD } from '../../app-initialize.factory';
import { CollectionConfigNameRecord } from '../../service/graph.types';
import { CollectionEdgeConfig } from '../../service/persistence/dto/collection-config.dto';
import { CollectionApiService } from '../../service/collection-api.service';
import { CollectionUtilService } from '../../service/collection-util.service';

@Component({
  selector: 'app-team-members',
  imports: [CommonModule, MatDividerModule, MatListModule, MatTableModule],
  templateUrl: './team-members.component.html',
  styleUrl: './team-members.component.scss',
})
export class TeamMembersComponent implements OnInit, OnDestroy, OnChanges {
  readonly collectionData = input<any>();
  readonly upstream = input.required<GraphDirectedCombo[]>();
  edges: CollectionEdgeConfig[] | undefined;

  private triggerRefresh = new Subject<void>();
  users: any = {};
  loading = true;
  userCount = 0;

  constructor(
    private readonly collectionApi: CollectionApiService,
    private readonly collectionUtil: CollectionUtilService,
    @Inject(CONFIG_RECORD)
    public readonly configRecord: CollectionConfigNameRecord,
  ) {}

  ngOnInit() {
    this.triggerRefresh
      .pipe(
        switchMap(() => {
          this.loading = true;
          return this.collectionApi.searchCollection('team', {
            id: this.collectionData().id,
            offset: 0,
            limit: 1,
          });
        }),
      )
      .subscribe((data) => {
        const userMap: any = {};
        const users: any = {};
        if (!this.edges) {
          return;
        }
        this.userCount = 0;
        for (const edge of this.edges) {
          users[edge.name] = [];
        }
        for (const { vertex } of data.data[0].upstream) {
          userMap[vertex.id] = {
            id: vertex.id,
            name: vertex.name,
          };
        }
        for (const { edge } of data.data[0].upstream) {
          this.userCount++;
          users[edge.name].push({
            id: edge.id,
            name: userMap[edge.source].name,
            vertex: edge.source,
          });
        }
        for (const edge of this.edges) {
          users[edge.name] = users[edge.name].sort((a: any, b: any) =>
            a.name.localeCompare(b.name),
          );
        }

        this.users = users;
        this.loading = false;
      });
    this.updateUserData();
  }

  ngOnDestroy() {
    this.triggerRefresh.complete();
  }

  ngOnChanges(): void {
    this.updateUserData();
  }

  navigateUser(vertexId: string) {
    this.collectionUtil.openInBrowserByVertexId('user', vertexId);
  }

  private updateUserData() {
    if (this.configRecord['user']) {
      this.edges = this.configRecord['user'].edges.filter(
        (edge) => edge.collection === 'team',
      );
      this.triggerRefresh.next();
    }
  }
}
