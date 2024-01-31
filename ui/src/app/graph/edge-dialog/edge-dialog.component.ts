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

import {
  Observable,
  debounceTime,
  distinctUntilChanged,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import {
  CollectionConfigMap,
  GraphDataVertex,
} from '../../service/graph.types';
import { GraphApiService } from '../../service/graph-api.service';
import { CollectionEdgeConfig } from '../../service/dto/collection-config-rest.dto';
import { VertexNameComponent } from '../vertex-name/vertex-name.component';
import { GraphDataResponseEdgeDto } from '../../service/dto/graph-data.dto';
import { PropertyEditorComponent } from '../property-editor/property-editor.component';
import { GraphTypeaheadResult } from '../../service/dto/graph-typeahead-result.dto';

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

  filteredOptions!: Observable<GraphTypeaheadResult>;

  @ViewChild(PropertyEditorComponent)
  private propertyEditorComponent!: PropertyEditorComponent;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public readonly data: {
      collection: string;
      config: CollectionConfigMap;
      vertex: GraphDataVertex;
      target?: GraphDataResponseEdgeDto;
    },
    public readonly dialogRef: MatDialogRef<EdgeDialogComponent>,
    private readonly graphApi: GraphApiService,
  ) {}

  ngOnInit(): void {
    this.filteredOptions = this.vertexControl.valueChanges.pipe(
      startWith(''),
      distinctUntilChanged(),
      debounceTime(1000),
      switchMap((searchTerm) => {
        const edge = this.edgeControl.value;
        if (
          !!edge &&
          typeof edge !== 'string' &&
          typeof searchTerm === 'string' &&
          searchTerm.length >= 3
        ) {
          return this.graphApi.doTypeaheadSearch(searchTerm, [edge.collection]);
        }
        return of({
          meta: {
            total: 0,
          },
          data: [],
        });
      }),
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
