import { Component, computed, OnDestroy, OnInit, signal, viewChild, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAccordion, MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import {
  Observable,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  of,
  startWith,
  switchMap,
  take,
} from 'rxjs';

import { GraphApiService } from '../../service/graph-api.service';
import { VertexSearchDto } from '../../service/persistence/dto/vertex.dto';
import { CollectionApiService } from '../../service/collection-api.service';
import { CONFIG_RECORD, CURRENT_USER } from '../../app-initialize.factory';
import { CollectionConfigNameRecord } from '../../service/graph.types';
import { CollectionEdgeConfig } from '../../service/persistence/dto/collection-config.dto';
import { GraphTypeaheadResult } from '../../service/graph/dto/graph-typeahead-result.dto';
import { PermissionService } from '../../service/permission.service';
import { UserSelfDto } from '../../service/persistence/dto/user.dto';
import { EdgetitlePipe } from '../../util/edgetitle.pipe';
import { HealthStatusService } from '../../service/health-status.service';
import { PreferencesService } from '../../preferences.service';

@Component({
  selector: 'app-member-dialog',
  imports: [
    CommonModule,
    FormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatChipsModule,
    MatDialogModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    ReactiveFormsModule,
    EdgetitlePipe,
  ],
  templateUrl: './member-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./member-dialog.component.scss'],
})
export class MemberDialogComponent implements OnInit, OnDestroy {
  readonly permission = inject(PermissionService);
  readonly dialogRef = inject<MatDialogRef<MemberDialogComponent>>(MatDialogRef);
  readonly data = inject<{
    vertex: string;
    name: string;
  }>(MAT_DIALOG_DATA);
  readonly user = inject<UserSelfDto>(CURRENT_USER);
  readonly configRecord = inject<CollectionConfigNameRecord>(CONFIG_RECORD);
  private readonly graphApi = inject(GraphApiService);
  private readonly collectionApi = inject(CollectionApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly healthStatus = inject(HealthStatusService);
  private readonly preferences = inject(PreferencesService);

  readonly edges = signal<CollectionEdgeConfig[] | undefined>(undefined);
  readonly users = signal<any>({});

  userRoleSelected = signal('');
  userControl = new FormControl<{ id: string } | string | undefined>(undefined);
  filteredOptions!: Observable<GraphTypeaheadResult>;

  private triggerRefresh = new Subject<void>();
  loading = signal(true);
  userCount = signal(0);
  isOwner = signal(false);
  modified = signal(false);

  groupByUser = signal(this.preferences.get('teamGroupBy') === 'user');

  accordion = viewChild.required(MatAccordion);

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

  readonly collectionSearchResult = computed(() => {
    // We need to return the raw search data for usersByUser computation
    // This is a placeholder - we'll store the raw data in a signal
    return this.searchResult();
  });

  private searchResult = signal<any>(null);

  onUserRoleChange(name: string) {
    if (this.userRoleSelected() === name) {
      return;
    }
    this.userRoleSelected.set(name);
  }

  onGroupChange(value: string) {
    this.preferences.set('teamGroupBy', value as 'user' | 'role');
    this.groupByUser.set(value === 'user');
  }

  getEdgeByName(name: string): CollectionEdgeConfig | undefined {
    return this.edges()?.find((e) => e.name === name);
  }

  ngOnInit() {
    this.triggerRefresh
      .pipe(
        switchMap(() => {
          this.loading.set(true);
          return this.collectionApi.searchCollection('team', {
            vertexId: this.data.vertex,
            offset: 0,
            limit: 1,
          });
        }),
      )
      .subscribe((data) => {
        const userMap: any = {};
        const users: any = {};
        const edges = this.edges();
        if (!edges) {
          return;
        }
        this.userCount.set(0);
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
          this.userCount.set(this.userCount() + 1);
          users[edge.name].push({
            id: edge.id,
            name: userMap[edge.source].name,
            vertex: edge.source,
          });
        }
        for (const edge of edges) {
          users[edge.name] = users[edge.name].sort((a: any, b: any) =>
            a.name.localeCompare(b.name),
          );
        }

        this.users.set(users);
        this.searchResult.set(data);
        this.loading.set(false);
        this.isOwner.set(this.users()['owner'].find(
          (user: any) => this.user.vertex == user.vertex,
        ));
      });
    this.filteredOptions = this.userControl.valueChanges.pipe(
      startWith(undefined),
      distinctUntilChanged(),
      debounceTime(1000),
      switchMap((searchTerm) => {
        if (typeof searchTerm === 'string' && searchTerm.length >= 2) {
          return this.graphApi.doTypeaheadSearch(searchTerm, ['user']);
        }
        return of({
          meta: {
            total: 0,
          },
          data: [],
        });
      }),
    );

    if (this.configRecord['user']) {
      this.edges.set(this.configRecord['user'].edges.filter(
        (edge) => edge.collection === 'team',
      ));
      this.triggerRefresh.next();
    }
  }

  ngOnDestroy() {
    if (this.modified() && (this.permission.hasAdmin() || this.isOwner())) {
      this.healthStatus.health$.pipe(take(1)).subscribe((health) => {
        if (health?.details?.['github']?.['alias']) {
          this.collectionApi.teamRefreshUsers(this.data.vertex).subscribe();
        } else {
          // Skip user refresh
        }
      });
    }
    this.triggerRefresh.complete();
  }

  isUserSelected() {
    return this.userControl.value && typeof this.userControl.value !== 'string';
  }

  addUser() {
    // console.log(this.userRoleSelected);
    // console.log(this.userControl.value);
    if (
      this.userControl.value &&
      typeof this.userControl.value !== 'string' &&
      this.userControl.value.id
    ) {
      this.graphApi
        .addEdge({
          name: this.userRoleSelected(),
          source: this.userControl.value.id,
          target: this.data.vertex,
        })
        .pipe(
          catchError((val) => {
            if (
              val.status === 400 &&
              val.error.error === 'No duplicate edges'
            ) {
              this.openSnackBar('This user already has this role');
            }
            throw val;
          }),
        )
        .subscribe(() => {
          this.userControl.setValue(undefined);
          this.modified.set(true);
          this.triggerRefresh.next();
        });
    }
  }

  private openSnackBar(message: string) {
    const config = new MatSnackBarConfig();
    config.duration = 5000;
    config.verticalPosition = 'bottom';
    this.snackBar.open(message, 'Dismiss', config);
  }

  removeUsers(data: any) {
    for (const datum of data) {
      const user = datum.value;
      this.graphApi.deleteEdge(user.id).subscribe(() => {
        this.modified.set(true);
        this.triggerRefresh.next();
      });
    }
  }

  removeRoles(data: any) {
    for (const datum of data) {
      const role = datum.value;
      this.graphApi.deleteEdge(role.edgeId).subscribe(() => {
        this.modified.set(true);
        this.triggerRefresh.next();
      });
    }
  }

  displayEdgeNames(edges: any): string {
    return edges.map((edge: any) => edge.name).join(', ');
  }

  displayFn(vertex: VertexSearchDto): string {
    if (vertex) {
      return vertex.name;
    } else {
      return '';
    }
  }
}
