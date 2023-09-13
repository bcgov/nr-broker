import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  Observable,
  Subject,
  debounceTime,
  distinctUntilChanged,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { GraphApiService } from '../../service/graph-api.service';
import { VertexSearchDto } from '../../service/dto/vertex-rest.dto';
import { CollectionApiService } from '../../service/collection-api.service';
import { CURRENT_USER } from '../../app-initialize.factory';
import { UserDto } from '../../service/graph.types';
import { CollectionEdgeConfig } from '../../service/dto/collection-config-rest.dto';

@Component({
  selector: 'app-member-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './member-dialog.component.html',
  styleUrls: ['./member-dialog.component.scss'],
})
export class MemberDialogComponent implements OnInit, OnDestroy {
  edges: CollectionEdgeConfig[] | undefined;
  users: any = {};

  userTypeSelected = 'developer';
  userControl = new FormControl<{ id: string } | string | undefined>(undefined);
  filteredOptions!: Observable<VertexSearchDto[]>;

  private triggerRefresh = new Subject<void>();
  loading = true;
  userCount = 0;
  isOwner = false;
  modified = false;

  constructor(
    private readonly graphApi: GraphApiService,
    private readonly collectionApi: CollectionApiService,
    public readonly dialogRef: MatDialogRef<MemberDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public readonly data: { id: string; vertex: string; name: string },
    @Inject(CURRENT_USER) public readonly user: UserDto,
  ) {}

  ngOnInit() {
    this.graphApi.getCollectionConfig('user').subscribe((config) => {
      if (config) {
        this.edges = config.edges.filter((edge) => edge.collection === 'team');
        this.triggerRefresh.next();
      }
    });

    this.triggerRefresh
      .pipe(
        switchMap(() => {
          this.loading = true;
          return this.collectionApi.searchCollection(
            'team',
            null,
            this.data.id,
            0,
            1,
          );
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
        for (const upstream of data.data[0].upstream) {
          userMap[upstream._id] = {
            id: upstream._id,
            name: upstream.name,
          };
        }
        for (const edge of data.data[0].upstream_edge) {
          this.userCount++;
          users[edge.name].push({
            id: edge._id,
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
        this.isOwner = this.users['owner'].find(
          (user: any) => this.user.vertex == user.vertex,
        );
      });
    this.filteredOptions = this.userControl.valueChanges.pipe(
      startWith(undefined),
      distinctUntilChanged(),
      debounceTime(1000),
      switchMap((searchTerm) => {
        if (typeof searchTerm === 'string' && searchTerm.length >= 3) {
          return this.graphApi.searchVertex('user', searchTerm);
        }
        return of([]);
      }),
    );
  }

  ngOnDestroy() {
    this.triggerRefresh.complete();
  }

  isUserSelected() {
    return this.userControl.value && typeof this.userControl.value !== 'string';
  }

  addUser() {
    // console.log(this.userTypeSelected);
    // console.log(this.userControl.value);
    if (
      this.userControl.value &&
      typeof this.userControl.value !== 'string' &&
      this.userControl.value.id
    ) {
      this.graphApi
        .addEdge({
          name: this.userTypeSelected,
          source: this.userControl.value.id,
          target: this.data.vertex,
        })
        .subscribe(() => {
          this.userControl.setValue(undefined);
          this.modified = true;
          this.triggerRefresh.next();
        });
    }
  }

  removeUsers(data: any) {
    for (const datum of data) {
      const user = datum.value;
      this.graphApi.deleteEdge(user.id).subscribe(() => {
        this.modified = true;
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
