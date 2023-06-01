import { Component, Inject, OnInit } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { NgFor, AsyncPipe } from '@angular/common';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

import { Observable, map, startWith } from 'rxjs';
import { GraphDataVertex } from '../../service/graph.types';
import { GraphApiService } from '../../service/graph-api.service';
import {
  CollectionConfigResponseDto,
  CollectionEdgeConfig,
} from '../../service/dto/collection-config-rest.dto';
import { CamelToTitlePipe } from '../camel-to-title.pipe';
import { VertexNameComponent } from '../vertex-name/vertex-name.component';

@Component({
  selector: 'app-add-edge-dialog',
  templateUrl: './add-edge-dialog.component.html',
  styleUrls: ['./add-edge-dialog.component.scss'],
  standalone: true,
  imports: [
    MatDialogModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatOptionModule,
    NgFor,
    MatInputModule,
    MatAutocompleteModule,
    VertexNameComponent,
    MatButtonModule,
    AsyncPipe,
    CamelToTitlePipe,
  ],
})
export class AddEdgeDialogComponent implements OnInit {
  edgeControl = new FormControl<string | CollectionEdgeConfig>('');
  vertexControl = new FormControl<string | GraphDataVertex>('');

  filteredOptions!: Observable<GraphDataVertex[]>;
  targetVertices: GraphDataVertex[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      config: CollectionConfigResponseDto;
      vertices: GraphDataVertex[];
      vertex: GraphDataVertex;
    },
    public dialogRef: MatDialogRef<AddEdgeDialogComponent>,
    private graphApi: GraphApiService,
  ) {}

  ngOnInit(): void {
    this.filteredOptions = this.vertexControl.valueChanges.pipe(
      startWith(''),
      map((value) => {
        if (typeof value === 'string') {
          return this._filter(value);
        } else {
          return [];
        }
      }),
    );
  }

  private _filter(value: string): GraphDataVertex[] {
    const filterValue = value.toLowerCase();

    return this.targetVertices.filter(
      (option) =>
        option.name.toLowerCase().includes(filterValue) ||
        (option.parentName &&
          option.parentName.toLocaleLowerCase().includes(filterValue)),
    );
  }

  displayFn(vertex: GraphDataVertex): string {
    if (vertex) {
      return vertex.parentName
        ? `${vertex.parentName} > ${vertex.name}`
        : vertex.name;
    } else {
      return '';
    }
  }

  configChanged() {
    const edge = this.edgeControl.value;
    if (!!edge && typeof edge !== 'string') {
      this.targetVertices = this.data.vertices
        .filter((vertex) => edge.collection === vertex.collection)
        .sort((a, b) => a.name.localeCompare(b.name));
      this.vertexControl.enable();
    } else {
      this.vertexControl.disable();
    }
  }

  addEdge() {
    const edge = this.edgeControl.value;
    const vertex = this.vertexControl.value;

    if (
      !!edge &&
      typeof edge !== 'string' &&
      !!vertex &&
      typeof vertex !== 'string'
    ) {
      this.graphApi
        .addEdge({
          name: edge.name,
          source: this.data.vertex.id,
          target: vertex.id,
        })
        .subscribe(() => {
          this.dialogRef.close({ refresh: true });
        });
    }
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
