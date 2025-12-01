import { Component, OnDestroy, OnInit, signal, viewChild, inject } from '@angular/core';
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
    MatProgressSpinnerModule,
    MatSelectModule,
    ReactiveFormsModule,
    EdgetitlePipe,
  ],
  templateUrl: './member-dialog.component.html',
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

  accordion = viewChild.required(MatAccordion);

  onUserRoleChange(name: string) {
    if (this.userRoleSelected() === name) {
      return;
    }
    this.userRoleSelected.set(name);
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
