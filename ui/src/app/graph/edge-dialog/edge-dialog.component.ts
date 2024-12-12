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
import { CollectionEdgeConfig } from '../../service/dto/collection-config.dto';
import { VertexNameComponent } from '../vertex-name/vertex-name.component';
import { PropertyEditorComponent } from '../property-editor/property-editor.component';
import { GraphTypeaheadResult } from '../../service/dto/graph-typeahead-result.dto';
import { EdgeDto } from '../../service/dto/edge.dto';
import { CONFIG_MAP } from '../../app-initialize.factory';
import { VertexDto } from '../../service/dto/vertex.dto';

@Component({
  selector: 'app-edge-dialog',
  templateUrl: './edge-dialog.component.html',
  styleUrls: ['./edge-dialog.component.scss'],
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
      source: VertexDto;
      edge?: EdgeDto;
    },
    public readonly dialogRef: MatDialogRef<EdgeDialogComponent>,
    private readonly graphApi: GraphApiService,
    @Inject(CONFIG_MAP) public readonly configMap: CollectionConfigMap,
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
          searchTerm.length >= 2
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
      !this.data.edge &&
      !!edge &&
      typeof edge !== 'string' &&
      !!vertex &&
      typeof vertex !== 'string'
    ) {
      this.graphApi
        .addEdge({
          name: edge.name,
          source: this.data.source.id,
          target: vertex.id,
          ...prop,
        })
        .subscribe(() => {
          this.dialogRef.close({ refresh: true });
        });
    } else if (this.data.edge) {
      this.graphApi
        .editEdge(this.data.edge.id, {
          name: this.data.edge.name,
          source: this.data.edge.source,
          target: this.data.edge.target,
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
