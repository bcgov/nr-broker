import { ChangeDetectorRef, Component, Inject, ViewChild } from '@angular/core';
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
import { CommonModule } from '@angular/common';

import {
  ChartClickTargetVertex,
  CollectionConfigMap,
} from '../../service/graph.types';
import { GraphApiService } from '../../service/graph-api.service';
import { VertexFormBuilderComponent } from '../vertex-form-builder/vertex-form-builder.component';
import { CollectionConfigResponseDto } from '../../service/dto/collection-config-rest.dto';

@Component({
  selector: 'app-vertex-dialog',
  templateUrl: './vertex-dialog.component.html',
  styleUrls: ['./vertex-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatDividerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    ReactiveFormsModule,
    VertexFormBuilderComponent,
  ],
})
export class VertexDialogComponent {
  collectionControl = new FormControl<string | CollectionConfigResponseDto>('');
  configs!: CollectionConfigResponseDto[];

  @ViewChild(VertexFormBuilderComponent)
  private formComponent!: VertexFormBuilderComponent;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      config: CollectionConfigMap;
      target?: ChartClickTargetVertex;
      data?: any;
    },
    public dialogRef: MatDialogRef<VertexDialogComponent>,
    private graphApi: GraphApiService,
    private changeDetectorRef: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.configs = Object.values(this.data.config)
      .filter((config) => config.permissions.create)
      .sort((a, b) => a.name.localeCompare(b.name));
    if (this.data.target) {
      const vData = this.data.target.data;
      const config = this.data.config[vData.collection];
      if (config) {
        this.collectionControl.setValue(config);
      }
      this.collectionControl.disable();
    } else {
      this.collectionControl.enable();
    }
    this.data.data;
  }

  ngAfterViewInit() {
    this.changeDetectorRef.detectChanges();
  }

  addUpdateVertex() {
    if (this.isFormInvalid()) {
      return;
    }
    const vertexData = {
      ...this.formComponent.form.value,
    };
    const config = this.collectionControl.value;
    if (this.isCollectionConfig(config)) {
      for (const fieldKey of Object.keys(config.fields)) {
        if (config.fields[fieldKey].type === 'embeddedDocArray') {
          continue;
        }
        const val =
          typeof vertexData[fieldKey] === 'string'
            ? vertexData[fieldKey].trim()
            : vertexData[fieldKey];
        if (config.fields[fieldKey].type === 'json') {
          if (val !== '') {
            vertexData[fieldKey] = JSON.parse(val);
          } else {
            delete vertexData[fieldKey];
          }
        }
        if (config.fields[fieldKey].type === 'stringArray') {
          vertexData[fieldKey] = val.split(',').map((s: string) => s.trim());
        }
        if (!config.fields[fieldKey].required && val === '') {
          delete vertexData[fieldKey];
        }
      }

      if (this.data.target) {
        this.graphApi
          .editVertex(this.data.target.data, vertexData)
          .subscribe(() => {
            this.dialogRef.close({ refresh: true });
          });
      } else {
        this.graphApi
          .addVertex({
            collection: config.collection,
            data: vertexData,
          })
          .subscribe(() => {
            this.dialogRef.close({ refresh: true });
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

  isCollectionConfig(cc: any): cc is CollectionConfigResponseDto {
    return cc.fields !== undefined;
  }
}
