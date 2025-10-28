import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { CollectionApiService } from './collection-api.service';
import { GraphApiService } from './graph-api.service';

@Injectable({
  providedIn: 'root',
})
export class PackageUtilService {
  private readonly router = inject(Router);
  private readonly collectionApi = inject(CollectionApiService);
  private readonly graphApi = inject(GraphApiService);
  private readonly snackBar = inject(MatSnackBar);


  async openPackageBuildVersion(vertexId: string, version: string) {
    this.graphApi
      .searchEdgesShallow('source', 'target', vertexId)
      .subscribe((targets) => {
        if (targets.length === 0) {
          this.openSnackBar('SCM url for this service is not set');
          throw new Error(`SCM url for this service is not set`);
        }

        if (targets.length > 1) {
          this.openSnackBar('Multiple repositories found for this service');
          throw new Error('Multiple repositories found for this service');
        }

        const target = targets[0];

        this.collectionApi
          .searchCollection('repository', {
            vertexId: target,
            offset: 0,
            limit: 1,
          })
          .subscribe((search) => {
            if (search.meta.total > 0) {
              const respository = search.data[0].collection;
              if (respository && respository.scmUrl) {
                if (respository.scmUrl.startsWith('https://github.com')) {
                  window.open(
                    `${respository.scmUrl}/commit/${version}`,
                    '_blank',
                  );
                } else {
                  this.openSnackBar(
                    `Unsupported SCM url: ${respository.scmUrl}`,
                  );
                }
                return;
              }

              this.openSnackBar('SCM url for this service is not set');
              throw new Error(`SCM url for this service is not set`);
            } else {
              this.openSnackBar('Repository not found');
              throw new Error('Repository not found');
            }
          });
      });
    return false;
  }

  async openHistoryById(id: string) {
    this.router.navigate([`/intention/${id}`]);
  }

  private openSnackBar(message: string) {
    const config = new MatSnackBarConfig();
    config.duration = 5000;
    config.verticalPosition = 'bottom';
    this.snackBar.open(message, 'Dismiss', config);
  }
}
