import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  catchError,
  debounceTime,
  firstValueFrom,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
  MatDialog,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { MatOptionModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

import {
  CollectionConfigNameRecord,
  GraphDataVertex,
} from '../../service/graph.types';
import { GraphApiService } from '../../service/graph-api.service';
import { CollectionEdgeConfig } from '../../service/persistence/dto/collection-config.dto';
import { VertexNameComponent } from '../vertex-name/vertex-name.component';
import { PropertyEditorComponent } from '../property-editor/property-editor.component';
import { EdgeDto } from '../../service/persistence/dto/edge.dto';
import { CONFIG_RECORD } from '../../app-initialize.factory';
import { VertexDto } from '../../service/persistence/dto/vertex.dto';
import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';
import { AddTeamDialogComponent } from '../../team/add-team-dialog/add-team-dialog.component';
import { VertexDialogComponent } from '../vertex-dialog/vertex-dialog.component';

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
    MatDividerModule,
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
  readonly data = inject<{
    collection: CollectionNames;
    source: VertexDto;
    edge?: EdgeDto;
}>(MAT_DIALOG_DATA);
  readonly dialogRef = inject<MatDialogRef<EdgeDialogComponent>>(MatDialogRef);
  readonly configRecord = inject<CollectionConfigNameRecord>(CONFIG_RECORD);
  private readonly graphApi = inject(GraphApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  edgeControl = new FormControl<string | CollectionEdgeConfig>('');
  vertexControl = new FormControl<string | GraphDataVertex | symbol>('');

  @ViewChild(PropertyEditorComponent)
  private propertyEditorComponent!: PropertyEditorComponent;

  public NEW_VERTEX = Symbol('newVertex');

  public vertexSearchSignal = toSignal(
    this.vertexControl.valueChanges.pipe(
      startWith(this.vertexControl.value),
      debounceTime(300),
      switchMap((term) => {
        const edge = this.edgeControl.value;
        if (
          !!edge &&
          typeof edge !== 'string' &&
          typeof term === 'string' &&
          term.length >= 2
        ) {
          return this.graphApi.doTypeaheadSearch(term, [edge.collection]);
        } else if (typeof term === 'symbol') {
          // If the term is a symbol, we assume it's the NEW_VERTEX symbol
          return of({
            meta: {
              total: 0,
              keepTyping: false,
            },
            data: [],
          });
        } else {
          return of({
            meta: {
              total: 0,
              keepTyping: true,
            },
            data: [],
          });
        }
      }),
    ),
    {
      initialValue: {
        meta: {
          total: 0,
          keepTyping: true,
        },
        data: [],
      },
    },
  );

  ngOnInit(): void {
    this.configChanged();
  }

  public vertexDropdownDisplayFn(vertex: GraphDataVertex | symbol): string {
    if (typeof vertex === 'symbol') {
      return 'Add Vertex';
    } else if (vertex && typeof vertex !== 'symbol') {
      return vertex.parentName
        ? `${vertex.parentName} > ${vertex.name}`
        : vertex.name;
    } else {
      return '';
    }
  }

  configChanged() {
    // If collection has only one edge, set it as default
    if (this.configRecord[this.data.collection].edges.length === 1) {
      this.edgeControl.setValue(
        this.configRecord[this.data.collection].edges[0],
      );
    }
    const edge = this.edgeControl.value;
    // console.log('configChanged', edge);
    if (!!edge && typeof edge !== 'string') {
      this.vertexControl.enable();
    } else {
      this.vertexControl.disable();
    }
    this.vertexControl.setValue(null);
  }

  // Handle if user presses delete or backspace on 'non-text' input
  onVertexInputKeyDown(event: KeyboardEvent) {
    const isDeleteKey = event.key === 'Backspace' || event.key === 'Delete';
    const currentValue = this.vertexControl.value;

    if (isDeleteKey && currentValue === this.NEW_VERTEX) {
      this.vertexControl.setValue(null);
      event.preventDefault();
    }
  }

  async addEditEdge() {
    const edge = this.edgeControl.value;
    const vertex = this.vertexControl.value;
    const prop = this.propertyEditorComponent.getPropertyValues();
    if (
      !vertex ||
      typeof vertex === 'string' ||
      !edge ||
      typeof edge === 'string'
    ) {
      return;
    }
    let target: string;
    if (typeof vertex === 'symbol') {
      if (this.data.edge) {
        // Does not make sense to create a new vertex if we are editing an edge
        return;
      }
      // If the vertex is the NEW_VERTEX symbol, we create a new vertex first
      target = await this.addVertex(edge.collection);
    } else {
      target = vertex.id;
    }

    if (!this.data.edge) {
      this.graphApi
        .addEdge({
          name: edge.name,
          source: this.data.source.id,
          target,
          ...prop,
        })
        .pipe(
          catchError((val) => {
            console.error('Error adding edge:', val);
            if (
              val.status === 400 &&
              val.error.error === 'No duplicate edges'
            ) {
              this.openSnackBar('This edge already exists');
            } else if (val.status === 400) {
              this.openSnackBar(val.error.error);
            }
            throw val;
          }),
        )
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

  async addVertex(collection: CollectionNames): Promise<string> {
    const dialogClass: any =
      collection === 'team' ? AddTeamDialogComponent : VertexDialogComponent;

    return firstValueFrom(
      this.dialog
        .open(dialogClass, {
          width: '500px',
          data: {
            configMap: {
              [collection]: this.configRecord[collection],
            },
            collection: collection,
          },
        })
        .afterClosed()
        .pipe(
          map((result) => {
            if (result && result.id) {
              return result.id;
            } else {
              throw new Error('No vertex created');
            }
          }),
        ),
    );
  }

  closeDialog() {
    this.dialogRef.close();
  }

  private openSnackBar(message: string) {
    const config = new MatSnackBarConfig();
    config.duration = 5000;
    config.verticalPosition = 'bottom';
    this.snackBar.open(message, 'Dismiss', config);
  }
}
