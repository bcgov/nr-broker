import { Component, OnChanges, computed, input, inject, output, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  CollectionDtoUnion,
  CollectionNames,
} from '../../service/persistence/dto/collection-dto-union.type';
import { GraphApiService } from '../../service/graph-api.service';
import { CONFIG_RECORD } from '../../app-initialize.factory';
import { CollectionConfigNameRecord } from '../../service/graph.types';
import { GraphUpDownDto } from '../../service/persistence/dto/graph-updown.dto';
import { CollectionUtilService } from '../../service/collection-util.service';
import { CollectionEdgeConfig } from '../../service/persistence/dto/collection-config.dto';
import { UserDto } from '../../service/persistence/dto/user.dto';

interface UserData {
  id: string;
  name: string;
  roleSet: Set<string>;
  roles: string[];
  linked: boolean;
}

interface TeamGroup {
  teamId: string;
  teamName: string;
  users: UserData[];
}

@Component({
  selector: 'app-inspector-people',
  imports: [
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    RouterModule,
  ],
  templateUrl: './inspector-people.component.html',
  styleUrl: './inspector-people.component.scss',
})
export class InspectorPeopleComponent implements OnChanges {
  private readonly graphApi = inject(GraphApiService);
  private readonly collectionUtil = inject(CollectionUtilService);
  readonly configMap = inject<CollectionConfigNameRecord>(CONFIG_RECORD);

  readonly collection = input.required<CollectionNames>();
  readonly vertex = input.required<string>();
  readonly filterVertex = input<string>();
  readonly navigated = output();

  collectionPeople = signal<GraphUpDownDto<any>[] | null>(null);
  users = signal<UserData[] | null>(null);
  teamGroups = signal<TeamGroup[]>([]);
  private edges: CollectionEdgeConfig[] | undefined;

  readonly propPeopleDisplayedColumns = computed(() => {
    return ['name', 'role'];
  });

  ngOnChanges() {
    if (this.configMap['user']) {
      this.edges = this.configMap['user'].edges.filter(
        (edge: { collection: string }) => edge.collection === 'team',
      );
    }

    this.getUpstreamUsers(this.vertex()).subscribe((data) => {
      // Group by team (edge.source is the team vertex)
      const teamMap = new Map<string, { teamName: string; users: Map<string, UserData> }>();
      const filterVertex = this.filterVertex();

      for (const upstream of data) {
        // upstream.vertex is the team vertex (where edge.source points to)
        const teamId = upstream.vertex.id;
        const teamName = upstream.vertex.name;

        // If filterVertex is set, only include users from that team
        if (filterVertex && upstream.collection.vertex !== filterVertex) {
          continue;
        }

        if (!teamMap.has(teamId)) {
          teamMap.set(teamId, {
            teamName,
            users: new Map<string, UserData>(),
          });
        }

        const team = teamMap.get(teamId)!;
        if (!team.users.has(upstream.collection.id)) {
          team.users.set(upstream.collection.id, {
            id: upstream.collection.id,
            name: upstream.collection.name,
            roleSet: new Set<string>(),
            roles: [],
            linked: !!upstream.collection.alias,
          });
        }

        team.users.get(upstream.collection.id)?.roleSet.add(upstream.edge.name);
      }

      // Convert roleSet to roles array for each user in each team
      const groups: TeamGroup[] = [];
      for (const [teamId, team] of teamMap) {
        const users: UserData[] = [];
        for (const user of team.users.values()) {
          for (const edge of this.edges || []) {
            if (user.roleSet.has(edge.name)) {
              user.roles.push(edge.name);
            }
          }
          users.push(user);
        }
        users.sort((a, b) => a.name.localeCompare(b.name));
        groups.push({
          teamId,
          teamName: team.teamName,
          users,
        });
      }

      groups.sort((a, b) => a.teamName.localeCompare(b.teamName));
      this.teamGroups.set(groups);

      // Also set flat users list for backward compatibility
      const allUsers: UserData[] = groups.flatMap((g) => g.users);
      this.users.set(allUsers);
      this.collectionPeople.set(data);
    });
  }

  private getUpstreamUsers(vertexId: string) {
    return this.graphApi.getUpstream<UserDto>(
      vertexId,
      this.configMap['user'].index,
    );
  }

  navigate(collection: keyof CollectionDtoUnion, vertexId: string) {
    this.collectionUtil.openInBrowserByVertexId(collection, vertexId);
    this.navigated.emit();
  }
}
