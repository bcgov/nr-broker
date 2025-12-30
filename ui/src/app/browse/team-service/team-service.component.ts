import { Component, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CollectionConfigInstanceDto } from '../../service/persistence/dto/collection-config.dto';
import { CollectionConfigNameRecord } from '../../service/graph.types';
import { CONFIG_RECORD } from '../../app-initialize.factory';
import { ColorUtilService } from '../../util/color-util.service';
import { CollectionApiService } from '../../service/collection-api.service';
import { GraphUtilService } from '../../service/graph-util.service';
import { EdgeDialogComponent } from '../../graph/edge-dialog/edge-dialog.component';
import { UserPermissionDto } from '../../service/persistence/dto/user-permission.dto';
import { PermissionService } from '../../service/permission.service';

@Component({
  selector: 'app-team-service',
  imports: [
    CommonModule,
    MatButtonModule,
    MatChipsModule,
    MatDialogModule,
    MatDividerModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './team-service.component.html',
  styleUrl: './team-service.component.scss',
})
export class TeamServiceComponent {
  private readonly router = inject(Router);
  private readonly colorUtil = inject(ColorUtilService);
  private readonly collectionApi = inject(CollectionApiService);
  private readonly graphUtil = inject(GraphUtilService);
  private readonly dialog = inject(MatDialog);
  private readonly permission = inject(PermissionService);

  readonly configRecord = inject<CollectionConfigNameRecord>(CONFIG_RECORD);

  readonly showHelp = input<boolean>(false);
  readonly service = input.required<CollectionConfigInstanceDto>();
  readonly userPermissions = input.required<UserPermissionDto>();

  readonly refresh = output<void>();

  readonly hasUpdate = computed(() =>
    this.permission.hasUpdate(this.userPermissions(), this.service().edge.prototype.target));

  propDisplayedColumns: string[] = ['key', 'value'];

  navigateToService($event: MouseEvent) {
    console.log(this.service());
    const target = this.service().edge.prototype.target;
    const instanceId = this.service().instance?.id;
    if ($event.altKey && instanceId) {
      this.graphUtil.openInGraph(instanceId, 'edge');
    } else {
      this.collectionApi
        .searchCollection('service', {
          vertexId: target,
          offset: 0,
          limit: 1,
        })
        .subscribe((result) => {
          if (result && result.meta.total > 0) {
            this.router.navigate(['/browse', 'service', result.data[0].collection.id]);
          }
        });
    }
  }

  getVisibleTextColor(backgroundColor: string) {
    return this.colorUtil.calculateLuminance(
      this.colorUtil.hexToRgb(backgroundColor),
    ) > 0.5
      ? '#000000'
      : '#FFFFFF';
  }

  editEdge() {
    const instance = this.service().instance;
    if (!instance) {
      return;
    }
    this.dialog
      .open(EdgeDialogComponent, {
        width: '500px',
        data: {
          collection: 'team',
          source: { id: instance.source },
          edge: instance,
          prototype: this.service().edge.prototype,
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (result && result.refresh) {
          this.refresh.emit();
        }
      });
  }

  // hasUpdate(): boolean {
  //   return true;
  // }
}
