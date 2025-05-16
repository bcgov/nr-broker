import { Component, Inject, ViewChild } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { GraphApiService } from '../../service/graph-api.service';
import { CollectionConfigNameRecord } from '../../service/graph.types';
import { CURRENT_USER } from '../../app-initialize.factory';
import { CollectionConfigDto } from '../../service/persistence/dto/collection-config.dto';
import { VertexFormBuilderComponent } from '../../graph/vertex-form-builder/vertex-form-builder.component';
import { lastValueFrom } from 'rxjs';
import { GraphUtilService } from '../../service/graph-util.service';
import { UserSelfDto } from '../../service/persistence/dto/user.dto';
import { CollectionUtilService } from '../../service/collection-util.service';

@Component({
  selector: 'app-add-team-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatDividerModule,
    VertexFormBuilderComponent,
  ],
  templateUrl: './add-team-dialog.component.html',
  styleUrl: './add-team-dialog.component.scss',
})
export class AddTeamDialogComponent {
  public config: CollectionConfigDto | undefined;

  @ViewChild(VertexFormBuilderComponent)
  private formComponent!: VertexFormBuilderComponent;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public readonly data: {
      configMap: CollectionConfigNameRecord;
      collection?: string;
      vertexId?: string;
      data?: any;
    },
    public readonly dialogRef: MatDialogRef<AddTeamDialogComponent>,
    private readonly graphApi: GraphApiService,
    private readonly graphUtil: GraphUtilService,
    private readonly collectionUtil: CollectionUtilService,
    @Inject(CURRENT_USER) public readonly user: UserSelfDto,
  ) {}

  ngOnInit(): void {
    this.config = this.collectionUtil.getCollectionConfigByName('team');
  }

  closeDialog() {
    this.dialogRef.close();
  }

  isFormInvalid() {
    return !this.formComponent?.form?.valid;
  }

  async addUpdateVertex() {
    if (this.isFormInvalid()) {
      return;
    }
    if (this.config) {
      const vertexData = this.graphUtil.extractVertexData(
        this.config,
        this.formComponent.form.value,
      );

      if (this.data.data) {
        this.graphApi
          .editVertex(this.data.data.vertex, {
            collection: 'team',
            data: vertexData,
          })
          .subscribe(() => {
            this.dialogRef.close({ refresh: true });
          });
      } else {
        const response = await lastValueFrom(
          this.graphApi.addVertex({
            collection: this.config.collection,
            data: vertexData,
          }),
        );

        this.graphApi
          .addEdge({
            name: 'owner',
            source: this.user.vertex,
            target: response.id,
          })
          .subscribe(() => {
            this.dialogRef.close({ refresh: true, id: response.id });
          });
      }
    }
  }
}
