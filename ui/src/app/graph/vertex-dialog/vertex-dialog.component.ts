import { ChangeDetectorRef, Component, OnInit, ViewChild, inject, AfterViewInit } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

import { CollectionConfigNameRecord } from '../../service/graph.types';
import { GraphApiService } from '../../service/graph-api.service';
import { VertexFormBuilderComponent } from '../vertex-form-builder/vertex-form-builder.component';
import { CollectionConfigDto } from '../../service/persistence/dto/collection-config.dto';
import { GraphUtilService } from '../../service/graph-util.service';
import { PropertyEditorComponent } from '../property-editor/property-editor.component';
import { VertexDto } from '../../service/persistence/dto/vertex.dto';
import { CONFIG_RECORD } from '../../app-initialize.factory';
import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';

@Component({
  selector: 'app-vertex-dialog',
  templateUrl: './vertex-dialog.component.html',
  styleUrls: ['./vertex-dialog.component.scss'],
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatDividerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    ReactiveFormsModule,
    PropertyEditorComponent,
    VertexFormBuilderComponent,
  ],
})
export class VertexDialogComponent implements OnInit, AfterViewInit {
  readonly data = inject<{
    collection?: string;
    data?: any;
    vertex?: VertexDto;
}>(MAT_DIALOG_DATA);
  readonly dialogRef = inject<MatDialogRef<VertexDialogComponent>>(MatDialogRef);
  private readonly graphApi = inject(GraphApiService);
  private readonly graphUtil = inject(GraphUtilService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly configRecord = inject<CollectionConfigNameRecord>(CONFIG_RECORD);

  collectionControl = new FormControl<string | CollectionConfigDto>('');
  configs!: CollectionConfigDto[];

  @ViewChild(VertexFormBuilderComponent)
  private formComponent!: VertexFormBuilderComponent;

  @ViewChild(PropertyEditorComponent)
  private propertyEditorComponent!: PropertyEditorComponent;

  ngOnInit() {
    this.configs = Object.values(this.configRecord)
      .filter((config) => config.permissions.create)
      .sort((a, b) => a.name.localeCompare(b.name));
    if (this.data.collection) {
      const config = this.configRecord[this.data.collection as CollectionNames];
      if (config) {
        this.collectionControl.setValue(config);
      }
      this.collectionControl.disable();
    } else {
      this.collectionControl.enable();
    }
  }

  ngAfterViewInit() {
    this.changeDetectorRef.detectChanges();
  }

  addUpdateVertex() {
    if (this.isFormInvalid()) {
      return;
    }
    const config = this.collectionControl.value;
    const prop = this.propertyEditorComponent.getPropertyValues();

    if (this.isCollectionConfig(config)) {
      const vertexData = this.graphUtil.extractVertexData(
        config,
        this.formComponent.form.value,
      );

      if (this.data.vertex) {
        this.graphApi
          .editVertex(this.data.vertex.id, {
            collection: config.collection,
            data: vertexData,
            ...prop,
          })
          .subscribe(() => {
            this.dialogRef.close({ refresh: true });
          });
      } else {
        this.graphApi
          .addVertex({
            collection: config.collection,
            data: vertexData,
            ...prop,
          })
          .subscribe((response) => {
            this.dialogRef.close({ refresh: true, id: response.id });
          });
      }
    }
  }

  closeDialog() {
    this.dialogRef.close();
  }

  isFormInvalid() {
    return !this.formComponent?.form?.valid;
  }

  isCollectionConfig(cc: any): cc is CollectionConfigDto {
    return cc.fields !== undefined;
  }
}
