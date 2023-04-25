import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  CollectionConfig,
  CollectionEdgeConfig,
  GraphDataVertex,
} from '../graph.types';
import { FormControl } from '@angular/forms';
import { Observable, map, startWith } from 'rxjs';
import { GraphApiService } from '../graph-api.service';

@Component({
  selector: 'app-add-edge-dialog',
  templateUrl: './add-edge-dialog.component.html',
  styleUrls: ['./add-edge-dialog.component.scss'],
})
export class AddEdgeDialogComponent implements OnInit {
  edgeControl = new FormControl<string | CollectionEdgeConfig>('');
  vertexControl = new FormControl<string | GraphDataVertex>('');

  filteredOptions!: Observable<GraphDataVertex[]>;
  targetVertices: GraphDataVertex[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      config: CollectionConfig;
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
      this.targetVertices = this.data.vertices.filter(
        (vertex) => edge.collection === vertex.collection,
      );
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
