import { Component, computed, input, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import {
  MatExpansionModule,
  MatExpansionPanel,
} from '@angular/material/expansion';
import { MatTableModule } from '@angular/material/table';
import { MatListModule } from '@angular/material/list';
import { MatDialog } from '@angular/material/dialog';
import { combineLatest, firstValueFrom, switchMap, tap } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';

import { CONFIG_RECORD } from '../../app-initialize.factory';
import { CollectionConfigNameRecord } from '../../service/graph.types';
import { CollectionEdgeConfig } from '../../service/persistence/dto/collection-config.dto';
import { CollectionApiService } from '../../service/collection-api.service';
import { CollectionUtilService } from '../../service/collection-util.service';
import { EdgetitlePipe } from '../../util/edgetitle.pipe';
import { CloneRolesDialogComponent } from '../../team/clone-roles-dialog/clone-roles-dialog.component';

@Component({
  selector: 'app-team-members',
  imports: [
    MatButtonModule,
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
  changeDetection: ChangeDetectionStrategy.Eager,
  viewProviders: [MatExpansionPanel],
})
export class TeamMembersComponent {
  private readonly collectionApi = inject(CollectionApiService);
  private readonly collectionUtil = inject(CollectionUtilService);
  private readonly dialog = inject(MatDialog);
  readonly configRecord = inject<CollectionConfigNameRecord>(CONFIG_RECORD);

  readonly teamId = input.required<string>();
  readonly groupByUser = input<boolean>(false);
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
  readonly usersByRole = computed(() => {
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

  readonly usersByUser = computed(() => {
    const data = this.collectionSearchResult();
    if (!data || !data.data[0]) {
      return [];
    }

    // Build user map from upstream vertices
    const userMap: Record<string, any> = {};
    for (const v of data.data[0].upstream) {
      userMap[v.vertex.id] = { id: v.vertex.id, name: v.vertex.name };
    }

    // Group edges by source user vertex
    const grouped: Record<string, { role: string; edgeId: string }[]> = {};
    for (const { edge } of data.data[0].upstream) {
      const userId = edge.source;
      if (!grouped[userId]) {
        grouped[userId] = [];
      }
      grouped[userId].push({ role: edge.name, edgeId: edge.id });
    }

    // Sort roles within each user and build final array sorted by name
    return Object.entries(grouped)
      .map(([userId, roles]) => ({
        id: userId,
        name: userMap[userId].name,
        vertex: userId,
        roles: roles.sort((a, b) => a.role.localeCompare(b.role)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly users = computed(() => {
    return this.groupByUser() ? this.usersByUser() : this.usersByRole();
  });

  readonly teamVertexId = computed(() => {
    return this.collectionSearchResult()?.data?.[0]?.collection?.vertex ?? null;
  });

  edges: CollectionEdgeConfig[] = this.configRecord['user'].edges.filter(
    (edge) => edge.collection === 'team',
  );

  loading = signal(true);

  getEdgeByName(name: string): CollectionEdgeConfig | undefined {
    return this.edges.find((e) => e.name === name);
  }

  navigateUser(vertexId: string) {
    this.collectionUtil.openInBrowserByVertexId('user', vertexId);
  }

  openCloneDialog(user: { id: string; name: string; vertex: string; roles: { role: string; edgeId: string }[] }) {
    const teamVertexId = this.teamVertexId();
    if (!teamVertexId) {
      return;
    }

    this.dialog.open(CloneRolesDialogComponent, {
      data: {
        teamId: this.teamId(),
        teamVertexId,
        sourceUserId: user.id,
        sourceUserName: user.name,
        sourceUserRoles: user.roles,
      },
    });
  }
}
