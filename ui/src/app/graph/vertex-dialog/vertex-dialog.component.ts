import {
  ChangeDetectorRef,
  Component,
  Inject,
  OnInit,
  ViewChild,
} from '@angular/core';
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

import { CollectionConfigMap } from '../../service/graph.types';
import { GraphApiService } from '../../service/graph-api.service';
import { VertexFormBuilderComponent } from '../vertex-form-builder/vertex-form-builder.component';
import { CollectionConfigRestDto } from '../../service/dto/collection-config-rest.dto';
import { GraphUtilService } from '../../service/graph-util.service';
import { PropertyEditorComponent } from '../property-editor/property-editor.component';
import { VertexRestDto } from '../../service/dto/vertex-rest.dto';
import { CONFIG_MAP } from '../../app-initialize.factory';

@Component({
  selector: 'app-vertex-dialog',
  templateUrl: './vertex-dialog.component.html',
  styleUrls: ['./vertex-dialog.component.scss'],
  standalone: true,
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
export class VertexDialogComponent implements OnInit {
  collectionControl = new FormControl<string | CollectionConfigRestDto>('');
  configs!: CollectionConfigRestDto[];

  @ViewChild(VertexFormBuilderComponent)
  private formComponent!: VertexFormBuilderComponent;

  @ViewChild(PropertyEditorComponent)
  private propertyEditorComponent!: PropertyEditorComponent;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public readonly data: {
      collection?: string;
      data?: any;
      vertex?: VertexRestDto;
    },
    public readonly dialogRef: MatDialogRef<VertexDialogComponent>,
    private readonly graphApi: GraphApiService,
    private readonly graphUtil: GraphUtilService,
    private readonly changeDetectorRef: ChangeDetectorRef,
    @Inject(CONFIG_MAP) private readonly configMap: CollectionConfigMap,
  ) {}

  ngOnInit() {
    this.configs = Object.values(this.configMap)
      .filter((config) => config.permissions.create)
      .sort((a, b) => a.name.localeCompare(b.name));
    if (this.data.collection) {
      const config = this.configMap[this.data.collection];
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

  isCollectionConfig(cc: any): cc is CollectionConfigRestDto {
    return cc.fields !== undefined;
  }
}
