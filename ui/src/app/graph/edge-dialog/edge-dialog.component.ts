import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { MatOptionModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

import { Observable, map, startWith } from 'rxjs';
import {
  CollectionConfigMap,
  GraphDataVertex,
} from '../../service/graph.types';
import { GraphApiService } from '../../service/graph-api.service';
import { CollectionEdgeConfig } from '../../service/dto/collection-config-rest.dto';
import { VertexNameComponent } from '../vertex-name/vertex-name.component';
import { GraphDataResponseEdgeDto } from '../../service/dto/graph-data.dto';
import { PropertyEditorComponent } from '../property-editor/property-editor.component';

@Component({
  selector: 'app-edge-dialog',
  templateUrl: './edge-dialog.component.html',
  styleUrls: ['./edge-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatOptionModule,
    MatSelectModule,
    PropertyEditorComponent,
    ReactiveFormsModule,
    VertexNameComponent,
  ],
})
export class EdgeDialogComponent implements OnInit {
  edgeControl = new FormControl<string | CollectionEdgeConfig>('');
  vertexControl = new FormControl<string | GraphDataVertex>('');

  filteredOptions!: Observable<GraphDataVertex[]>;
  targetVertices: GraphDataVertex[] = [];

  @ViewChild(PropertyEditorComponent)
  private propertyEditorComponent!: PropertyEditorComponent;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      collection: string;
      config: CollectionConfigMap;
      vertices: GraphDataVertex[];
      vertex: GraphDataVertex;
      target?: GraphDataResponseEdgeDto;
    },
    public dialogRef: MatDialogRef<EdgeDialogComponent>,
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

  addEditEdge() {
    const edge = this.edgeControl.value;
    const vertex = this.vertexControl.value;
    const prop = this.propertyEditorComponent.getPropertyValues();

    if (
      !this.data.target &&
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
          ...prop,
        })
        .subscribe(() => {
          this.dialogRef.close({ refresh: true });
        });
    } else if (this.data.target) {
      this.graphApi
        .editEdge(this.data.target.id, {
          name: this.data.target.name,
          source: this.data.target.source,
          target: this.data.target.target,
          ...prop,
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
