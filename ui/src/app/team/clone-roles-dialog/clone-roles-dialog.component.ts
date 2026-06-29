import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
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
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import {
  Observable,
  debounceTime,
  distinctUntilChanged,
  of,
  startWith,
  switchMap,
} from 'rxjs';

import { GraphApiService } from '../../service/graph-api.service';
import { VertexSearchDto } from '../../service/persistence/dto/vertex.dto';
import { CollectionApiService } from '../../service/collection-api.service';
import { CONFIG_RECORD } from '../../app-initialize.factory';
import { CollectionConfigNameRecord } from '../../service/graph.types';
import { CollectionEdgeConfig } from '../../service/persistence/dto/collection-config.dto';
import { GraphTypeaheadResult } from '../../service/graph/dto/graph-typeahead-result.dto';
import { EdgetitlePipe } from '../../util/edgetitle.pipe';

@Component({
  selector: 'app-clone-roles-dialog',
  imports: [
    CommonModule,
    FormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatChipsModule,
    MatDialogModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    ReactiveFormsModule,
    EdgetitlePipe,
  ],
  templateUrl: './clone-roles-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './clone-roles-dialog.component.scss',
})
export class CloneRolesDialogComponent implements OnInit {
  readonly dialogRef = inject<MatDialogRef<CloneRolesDialogComponent>>(MatDialogRef);
  readonly data = inject<{
    teamId: string;
    teamVertexId: string;
    sourceUserId: string;
    sourceUserName: string;
    sourceUserRoles: { role: string; edgeId: string }[];
  }>(MAT_DIALOG_DATA);

  readonly configRecord = inject<CollectionConfigNameRecord>(CONFIG_RECORD);
  private readonly graphApi = inject(GraphApiService);
  private readonly collectionApi = inject(CollectionApiService);

  readonly edges = signal<CollectionEdgeConfig[] | undefined>(undefined);
  readonly targetUsers = signal<Record<string, { id: string; name: string; vertex: string }>>({});

  userControl = new FormControl<{ id: string } | string | undefined>(undefined);
  filteredOptions!: Observable<GraphTypeaheadResult>;

  loading = signal(true);
  targetUserRoles = signal<{ role: string }[]>([]);

  selectedTargetUser = signal<{ id: string; name: string; vertex: string } | null>(null);

  ngOnInit() {
    if (this.configRecord['user']) {
      this.edges.set(this.configRecord['user'].edges.filter(
        (edge) => edge.collection === 'team',
      ));
    }

    this.loadTargetUsers();

    this.filteredOptions = this.userControl.valueChanges.pipe(
      startWith(undefined),
      distinctUntilChanged(),
      debounceTime(300),
      switchMap((searchTerm) => {
        if (typeof searchTerm === 'string' && searchTerm.length >= 2) {
          return this.graphApi.doTypeaheadSearch(searchTerm, ['user']);
        }
        return of({
          meta: { total: 0 },
          data: [],
        });
      }),
    );
  }

  loadTargetUsers() {
    this.collectionApi.searchCollection('team', {
      vertexId: this.data.teamVertexId,
      offset: 0,
      limit: 1,
    }).subscribe({
      next: (data) => {
        const userMap: Record<string, { id: string; name: string; vertex: string }> = {};
        const userRolesMap: Record<string, Set<string>> = {};

        if (data.data[0]?.upstream) {
          for (const { edge, vertex } of data.data[0].upstream) {
            userMap[vertex.id] = {
              id: vertex.id,
              name: vertex.name,
              vertex: vertex.id,
            };
            if (!userRolesMap[edge.source]) {
              userRolesMap[edge.source] = new Set();
            }
            if (!userRolesMap[vertex.id]) {
              userRolesMap[vertex.id] = new Set();
            }

            const roleName = this.normalizeRoleName(edge.name);
            userRolesMap[edge.source].add(roleName);
            userRolesMap[vertex.id].add(roleName);
          }
        }

        this.targetUsers.set(userMap);
        this.userRolesMap = userRolesMap;
      },
      error: () => { /* empty */ },
      complete: () => {
        this.loading.set(false);
      },
    });
  }

  private userRolesMap: Record<string, Set<string>> = {};

  onUserSelected(event: MatAutocompleteSelectedEvent) {
    const selected = event.option.value as VertexSearchDto | null;
    if (!selected?.id) {
      this.selectedTargetUser.set(null);
      this.targetUserRoles.set([]);
      return;
    }

    const teamUser = this.targetUsers()[selected.id];
    if (teamUser) {
      this.selectedTargetUser.set(teamUser);
      this.loadTargetUserRoles(selected.id);
      return;
    }

    this.resolveSelectedUserVertex(selected);
  }

  private resolveSelectedUserVertex(selected: VertexSearchDto) {
    this.collectionApi.searchCollection('user', {
      vertexId: selected.id,
      offset: 0,
      limit: 1,
    }).subscribe((resultByVertex) => {
      if (resultByVertex?.meta?.total > 0) {
        const user = resultByVertex.data[0];
        this.selectedTargetUser.set({
          id: user.collection.id,
          name: user.collection.name,
          vertex: user.vertex.id,
        });
        this.loadTargetUserRoles(user.vertex.id);
        return;
      }

      this.collectionApi.searchCollection('user', {
        id: selected.id,
        offset: 0,
        limit: 1,
      }).subscribe((resultById) => {
        if (resultById?.meta?.total > 0) {
          const user = resultById.data[0];
          this.selectedTargetUser.set({
            id: user.collection.id,
            name: user.collection.name,
            vertex: user.vertex.id,
          });
          this.loadTargetUserRoles(user.vertex.id);
          return;
        }

        this.selectedTargetUser.set(null);
        this.targetUserRoles.set([]);
      });
    });
  }

  loadTargetUserRoles(userId: string) {
    const targetRoles = this.userRolesMap[userId] || new Set<string>();
    const sourceRoleNames = new Set(
      this.data.sourceUserRoles.map((r) => this.normalizeRoleName(r.role)),
    );

    const missingRoles: { role: string }[] = [];
    for (const roleName of sourceRoleNames) {
      if (!targetRoles.has(roleName)) {
        missingRoles.push({ role: roleName });
      }
    }

    this.targetUserRoles.set(missingRoles);
  }

  private normalizeRoleName(role: string): string {
    return role.trim().toLowerCase();
  }

  get missingRoles() {
    return this.targetUserRoles();
  }

  get hasMissingRoles() {
    return this.missingRoles.length > 0;
  }

  get canClone() {
    return this.selectedTargetUser() !== null && this.hasMissingRoles;
  }

  getEdgeByName(name: string): CollectionEdgeConfig | undefined {
    return this.edges()?.find((e) => e.name === name);
  }

  displayFn(vertex: VertexSearchDto): string {
    if (vertex) {
      return vertex.name;
    }
    return '';
  }

  async cloneRoles() {
    if (!this.selectedTargetUser() || !this.hasMissingRoles) {
      return;
    }

    for (const { role } of this.missingRoles) {
      await new Promise<void>((resolve) => {
        this.graphApi
          .addEdge({
            name: role,
            source: this.selectedTargetUser()!.vertex,
            target: this.data.teamVertexId,
          })
          .subscribe({
            next: () => resolve(),
            error: (err) => {
              if (err.status === 400 && err.error?.error === 'No duplicate edges') {
                resolve();
              } else {
                resolve();
              }
            },
          });
      });
    }

    this.dialogRef.close({ refresh: true });
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
