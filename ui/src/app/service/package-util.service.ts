import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { CollectionApiService } from './collection-api.service';

@Injectable({
  providedIn: 'root',
})
export class PackageUtilService {
  constructor(
    private readonly router: Router,
    private readonly collectionApi: CollectionApiService,
    private readonly snackBar: MatSnackBar,
  ) {}

  async openPackageBuildVersion(id: string, version: string) {
    this.collectionApi.getCollectionById('service', id).subscribe((service) => {
      if (service && service.scmUrl) {
        if (service.scmUrl.startsWith('https://github.com')) {
          window.open(`${service.scmUrl}/commit/${version}`, '_blank');
        } else {
          this.openSnackBar(`Unsupported SCM url: ${service.scmUrl}`);
        }
        return;
      }

      this.openSnackBar('SCM url for this service is not set');
      throw new Error(`SCM url for this service is not set`);
    });
    return false;
  }

  async openHistoryById(id: string) {
    this.router.navigate([
      '/intention/history',
      {
        field: 'id',
        value: id,
      },
    ]);
  }

  private openSnackBar(message: string) {
    const config = new MatSnackBarConfig();
    config.duration = 5000;
    config.verticalPosition = 'bottom';
    this.snackBar.open(message, 'Dismiss', config);
  }
}
