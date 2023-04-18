import { ChangeDetectorRef, Component, Inject, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  ChartClickTargetVertex,
  CollectionConfig,
  CollectionConfigMap,
} from '../graph.types';
import { GraphApiService } from '../graph-api.service';
import { VertexFormBuilderComponent } from '../vertex-form-builder/vertex-form-builder.component';

@Component({
  selector: 'app-vertex-dialog',
  templateUrl: './vertex-dialog.component.html',
  styleUrls: ['./vertex-dialog.component.scss'],
})
export class VertexDialogComponent {
  collectionControl = new FormControl<string | CollectionConfig>('');

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

    if (this.data.target) {
      this.graphApi
        .editVertex(this.data.target.data, this.formComponent.form.value)
        .subscribe(() => {
          this.dialogRef.close({ refresh: true });
        });
    } else {
      this.graphApi
        .addVertex(
          this.collectionControl.value as CollectionConfig,
          this.formComponent.form.value,
        )
        .subscribe(() => {
          this.dialogRef.close({ refresh: true });
        });
    }
  }

  closeDialog() {
    this.dialogRef.close();
  }

  isFormInvalid() {
    return !this.formComponent?.form?.valid;
  }

  isCollectionConfig(cc: any): cc is CollectionConfig {
    return cc.fields !== undefined;
  }
}
