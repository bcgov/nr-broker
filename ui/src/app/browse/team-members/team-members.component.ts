import { Component, computed, input, inject, signal } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import {
  MatExpansionModule,
  MatExpansionPanel,
} from '@angular/material/expansion';
import { MatTableModule } from '@angular/material/table';
import { MatListModule } from '@angular/material/list';
import { combineLatest, firstValueFrom, switchMap, tap } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

import { CONFIG_RECORD } from '../../app-initialize.factory';
import { CollectionConfigNameRecord } from '../../service/graph.types';
import { CollectionEdgeConfig } from '../../service/persistence/dto/collection-config.dto';
import { CollectionApiService } from '../../service/collection-api.service';
import { CollectionUtilService } from '../../service/collection-util.service';
import { EdgetitlePipe } from '../../util/edgetitle.pipe';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-team-members',
  imports: [
    MatDividerModule,
    MatExpansionModule,
    MatChipsModule,
    MatIconModule,
    MatListModule,
    MatTableModule,
    EdgetitlePipe,
  ],
  templateUrl: './team-members.component.html',
  styleUrl: './team-members.component.scss',
  viewProviders: [MatExpansionPanel],
})
export class TeamMembersComponent {
  private readonly collectionApi = inject(CollectionApiService);
  private readonly collectionUtil = inject(CollectionUtilService);
  readonly configRecord = inject<CollectionConfigNameRecord>(CONFIG_RECORD);

  readonly teamId = input.required<string>();
  readonly refresh = signal<number>(0);
  readonly collectionSearchResult = toSignal(
    combineLatest([toObservable(this.teamId), toObservable(this.refresh)]).pipe(
      switchMap(([id]) => {
        this.loading.set(true);
        return firstValueFrom(
          this.collectionApi
            .searchCollection('team', {
              id,
              offset: 0,
              limit: 1,
            })
            .pipe(
              tap(() => {
                this.loading.set(false);
              }),
            ),
        );
      }),
    ),
  );
  readonly userCount = computed(() => {
    const data = this.collectionSearchResult();
    if (!data) {
      return 0;
    }
    return data.data[0].upstream.length;
  });
  readonly users = computed(() => {
    const data = this.collectionSearchResult();
    const edges = this.edges;
    const userMap: any = {};
    const users: any = {};

    if (!edges || !data) {
      return;
    }
    for (const edge of edges) {
      users[edge.name] = [];
    }
    for (const { vertex } of data.data[0].upstream) {
      userMap[vertex.id] = {
        id: vertex.id,
        name: vertex.name,
      };
    }
    for (const { edge } of data.data[0].upstream) {
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

    return users;
  });

  edges: CollectionEdgeConfig[] = this.configRecord['user'].edges.filter(
    (edge) => edge.collection === 'team',
  );

  loading = signal(true);

  navigateUser(vertexId: string) {
    this.collectionUtil.openInBrowserByVertexId('user', vertexId);
  }
}
