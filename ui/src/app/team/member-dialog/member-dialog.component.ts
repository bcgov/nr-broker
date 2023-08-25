import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';

import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Observable, Subject, startWith, switchMap } from 'rxjs';
import { GraphApiService } from '../../service/graph-api.service';
import { VertexSearchDto } from '../../service/dto/vertex-rest.dto';
import { CollectionApiService } from '../../service/collection-api.service';
import { CURRENT_USER } from '../../app-initialize.factory';
import { UserDto } from '../../service/graph.types';

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
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './member-dialog.component.html',
  styleUrls: ['./member-dialog.component.scss'],
})
export class MemberDialogComponent implements OnInit, OnDestroy {
  users: any = [];
  userMap: any = {};

  userTypeSelected = 'developer';
  userControl = new FormControl<{ id: string } | undefined>(undefined);
  filteredOptions!: Observable<VertexSearchDto[]>;

  private triggerRefresh = new Subject<void>();
  loading = true;

  constructor(
    private graphApi: GraphApiService,
    private collectionApi: CollectionApiService,
    @Inject(MAT_DIALOG_DATA)
    public data: { id: string; vertex: string; name: string },
    @Inject(CURRENT_USER) public user: UserDto,
  ) {}

  ngOnInit() {
    console.log(this.user);

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
        for (const upstream of data.data[0].upstream) {
          userMap[upstream._id] = {
            id: upstream._id,
            name: upstream.name,
            edges: [],
          };
        }
        for (const edge of data.data[0].upstream_edge) {
          userMap[edge.source].edges.push({
            id: edge._id,
            name: edge.name,
          });
        }
        this.users = Object.values(userMap);
        this.userMap = userMap;
        console.log(this.users);
      });
    this.filteredOptions = this.userControl.valueChanges.pipe(
      startWith(undefined),
      switchMap((value) => this.graphApi.searchVertex('user', value?.id ?? '')),
    );
    this.triggerRefresh.next();
  }

  ngOnDestroy() {
    this.triggerRefresh.complete();
  }

  addUser() {
    // console.log(this.userTypeSelected);
    // console.log(this.userControl.value);
    if (this.userControl.value && this.userControl.value.id) {
      this.graphApi
        .addEdge({
          name: this.userTypeSelected,
          source: this.userControl.value.id,
          target: this.data.vertex,
        })
        .subscribe(() => {
          this.userControl.setValue(undefined);
          this.triggerRefresh.next();
        });
    }
  }

  removeUsers(data: any) {
    for (const datum of data) {
      const user = datum.value;
      for (const edge of user.edges) {
        this.graphApi.deleteEdge(edge.id).subscribe(() => {
          this.triggerRefresh.next();
        });
      }
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
