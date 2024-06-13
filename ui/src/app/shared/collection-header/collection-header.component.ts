import { Component, Inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';

import { GraphUtilService } from '../../service/graph-util.service';
import { CollectionNames } from '../../service/dto/collection-dto-union.type';
import { CollectionConfigRestDto } from '../../service/dto/collection-config-rest.dto';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { VertexDialogComponent } from '../../graph/vertex-dialog/vertex-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { TagDialogComponent } from '../../graph/tag-dialog/tag-dialog.component';
import { DeleteConfirmDialogComponent } from '../../graph/delete-confirm-dialog/delete-confirm-dialog.component';
import { GraphApiService } from '../../service/graph-api.service';
import { CURRENT_USER } from '../../app-initialize.factory';
import { UserDto } from '../../service/graph.types';

@Component({
  selector: 'app-collection-header',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDividerModule,
    MatCardModule,
    MatIconModule,
  ],
  templateUrl: './collection-header.component.html',
  styleUrl: './collection-header.component.scss',
})
export class CollectionHeaderComponent {
  @Input() config!: CollectionConfigRestDto;
  @Input() collection!: CollectionNames;
  @Input() collectionData!: any;
  @Input() isTargetOwner!: boolean;

  constructor(
    private readonly dialog: MatDialog,
    private readonly graphUtil: GraphUtilService,
    private readonly graphApi: GraphApiService,
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    @Inject(CURRENT_USER) public readonly user: UserDto,
  ) {}

  openInGraph() {
    if (this.collectionData) {
      this.graphUtil.openInGraph(this.collectionData.vertex, 'vertex');
    }
  }

  back() {
    this.router.navigate(['..'], { relativeTo: this.activatedRoute });
  }

  isBrowseDisabled() {
    return !this.config.permissions.browse;
  }

  edit() {
    this.dialog
      .open(VertexDialogComponent, {
        width: '500px',
        data: {
          configMap: { [this.config.name]: this.config },
          collection: this.config.name,
          vertexId: this.collectionData.vertex,
          data: this.collectionData,
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (result && result.refresh) {
          // this.refreshData();
        }
      });
  }

  editTags() {
    if (!this.config || !this.collectionData) {
      return;
    }
    this.dialog
      .open(TagDialogComponent, {
        width: '500px',
        data: {
          collection: this.collection,
          collectionData: this.collectionData,
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (result && result.refresh) {
          // this.refreshData();
        }
      });
  }

  delete() {
    this.dialog
      .open(DeleteConfirmDialogComponent, {
        width: '500px',
      })
      .afterClosed()
      .subscribe((result) => {
        if (result && result.confirm) {
          this.graphApi
            .deleteVertex(this.collectionData.vertex)
            .subscribe(() => {
              // this.refreshData();
            });
        }
      });
  }
}
