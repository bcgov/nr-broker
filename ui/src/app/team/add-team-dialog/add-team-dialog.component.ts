import { Component, Inject, ViewChild } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { GraphApiService } from '../../service/graph-api.service';
import { UserDto } from '../../service/graph.types';
import { CURRENT_USER } from '../../app-initialize.factory';
import { CollectionConfigRestDto } from '../../service/dto/collection-config-rest.dto';
import { VertexFormBuilderComponent } from '../../graph/vertex-form-builder/vertex-form-builder.component';
import { lastValueFrom } from 'rxjs';
import { GraphUtilService } from '../../service/graph-util.service';

@Component({
  selector: 'app-add-team-dialog',
  standalone: true,
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
  public config: CollectionConfigRestDto | undefined;

  @ViewChild(VertexFormBuilderComponent)
  private formComponent!: VertexFormBuilderComponent;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public readonly data: {
      team?: any;
    },
    public readonly dialogRef: MatDialogRef<AddTeamDialogComponent>,
    private readonly graphApi: GraphApiService,
    private readonly graphUtil: GraphUtilService,
    @Inject(CURRENT_USER) public readonly user: UserDto,
  ) {}

  ngOnInit(): void {
    this.graphApi.getConfig().subscribe((data) => {
      this.config = data.find((config) => config.collection === 'team');
    });
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

      if (this.data.team) {
        this.graphApi
          .editVertex(this.data.team.vertex, {
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
            this.dialogRef.close({ refresh: true });
          });
      }
    }
  }
}
