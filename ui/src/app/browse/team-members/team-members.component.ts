import {
  Component,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatListModule } from '@angular/material/list';
import { Subject, switchMap } from 'rxjs';

import { InspectorTeamComponent } from '../../graph/inspector-team/inspector-team.component';
import { GraphDirectedRestCombo } from '../../service/dto/collection-combo-rest.dto';
import { CONFIG_MAP } from '../../app-initialize.factory';
import { CollectionConfigMap } from '../../service/graph.types';
import { CollectionEdgeConfig } from '../../service/dto/collection-config-rest.dto';
import { CollectionApiService } from '../../service/collection-api.service';
import { CollectionUtilService } from '../../service/collection-util.service';

@Component({
  selector: 'app-team-members',
  standalone: true,
  imports: [
    CommonModule,
    InspectorTeamComponent,
    MatListModule,
    MatTableModule,
  ],
  templateUrl: './team-members.component.html',
  styleUrl: './team-members.component.scss',
})
export class TeamMembersComponent implements OnInit, OnDestroy, OnChanges {
  @Input() collectionData: any;
  @Input() upstream!: GraphDirectedRestCombo[];
  edges: CollectionEdgeConfig[] | undefined;

  private triggerRefresh = new Subject<void>();
  users: any = {};
  loading = true;
  userCount = 0;

  constructor(
    private readonly collectionApi: CollectionApiService,
    private readonly collectionUtil: CollectionUtilService,
    @Inject(CONFIG_MAP) public readonly configMap: CollectionConfigMap,
  ) {}

  ngOnInit() {
    this.triggerRefresh
      .pipe(
        switchMap(() => {
          this.loading = true;
          return this.collectionApi.searchCollection('team', {
            id: this.collectionData.id,
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
    if (this.configMap['user']) {
      this.edges = this.configMap['user'].edges.filter(
        (edge) => edge.collection === 'team',
      );
      this.triggerRefresh.next();
    }
  }
}
