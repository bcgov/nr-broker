import {
  Component,
  Inject,
  OnChanges,
  booleanAttribute,
  computed,
  input,
} from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { of } from 'rxjs';
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

@Component({
  selector: 'app-inspector-people',
  imports: [
    CommonModule,
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
  readonly collection = input.required<CollectionNames>();
  readonly vertex = input.required<string>();
  readonly showLinked = input(false, { transform: booleanAttribute });

  edges: CollectionEdgeConfig[] | undefined;
  collectionPeople: GraphUpDownDto<any>[] | null = null;
  users: UserData[] | null = null;

  readonly propPeopleDisplayedColumns = computed(() => {
    return this.showLinked() ? ['name', 'role', 'linked'] : ['name', 'role'];
  });

  constructor(
    private readonly graphApi: GraphApiService,
    private readonly collectionUtil: CollectionUtilService,
    @Inject(CONFIG_RECORD)
    public readonly configMap: CollectionConfigNameRecord,
  ) {}

  ngOnChanges() {
    if (this.configMap['user']) {
      this.edges = this.configMap['user'].edges.filter(
        (edge: { collection: string }) => edge.collection === 'team',
      );
    }

    this.getUpstreamUsers(this.vertex()).subscribe((data) => {
      const userMap: Map<string, UserData> = new Map();

      for (const upstream of data) {
        if (!userMap.has(upstream.collection.id)) {
          userMap.set(upstream.collection.id, {
            id: upstream.collection.id,
            name: upstream.collection.name,
            roleSet: new Set<string>(),
            roles: [],
            linked: !!upstream.collection.alias,
          });
        }

        userMap.get(upstream.collection.id)?.roleSet.add(upstream.edge.name);
        userMap.get(upstream.edge.target)?.roleSet.add(upstream.edge.name);
      }

      for (const user of userMap.values()) {
        for (const edge of this.edges || []) {
          if (user.roleSet.has(edge.name)) {
            user.roles.push(edge.name);
          }
        }
      }

      this.users = [...userMap.values()].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      this.collectionPeople = data;
    });
  }

  private getUpstreamUsers(vertexId: string) {
    const mapCollectionToEdgeName: { [key: string]: string[] } = {
      repository: [
        'developer',
        'lead-developer',
        'full-access',
        'owner',
        'tester',
      ],
      service: [
        'developer',
        'lead-developer',
        'full-access',
        'prod-operator',
        'owner',
        'tester',
      ],
      project: [
        'developer',
        'lead-developer',
        'full-access',
        'prod-operator',
        'owner',
        'tester',
      ],
      brokerAccount: ['lead-developer', 'full-access'],
    };
    const collection = this.collection();
    if (!Object.keys(mapCollectionToEdgeName).includes(collection)) {
      return of([]);
    }

    return this.graphApi.getUpstream<UserDto>(
      vertexId,
      this.configMap['user'].index,
      mapCollectionToEdgeName[collection],
    );
  }

  navigate(collection: keyof CollectionDtoUnion, vertexId: string) {
    this.collectionUtil.openInBrowserByVertexId(collection, vertexId);
  }
}
