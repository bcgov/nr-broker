import { CommonModule } from '@angular/common';
import { Component, input, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

import { RepositoryDto } from '../../service/persistence/dto/repository.dto';
import { OpenShiftProjectDto } from '../../service/persistence/dto/openshift-project.dto';
import { SystemApiService } from '../../service/system-api.service';
import { HealthStatusService } from '../../service/health-status.service';
import { GithubRoleMappingDialogComponent } from '../github-role-mapping-dialog/github-role-mapping-dialog.component';
import { GithubSecretsDialogComponent } from '../github-secrets-dialog/github-secrets-dialog.component';
import { DetailsItemComponent } from '../../shared/details-item/details-item.component';
import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';

@Component({
  selector: 'app-inspector-repository-sync',
  imports: [
    CommonModule,
    MatButtonModule,
    MatTooltipModule,
    DetailsItemComponent,
  ],
  templateUrl: './inspector-repository-sync.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './inspector-repository-sync.component.scss',
})
export class InspectorRepositorySyncComponent {
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly systemApi = inject(SystemApiService);
  private readonly healthStatus = inject(HealthStatusService);

  readonly collection = input.required<CollectionNames>();
  readonly data = input.required<RepositoryDto | OpenShiftProjectDto>();
  readonly hasSudo = input(false);
  readonly header = input<'small' | 'large'>('small');

  readonly syncAvailable = computed(() => {
    const isRepository = this.collection() === 'repository';
    if (!isRepository) return true;
    return this.healthStatus.healthSignal()?.['details']?.['github']?.['sync'] ?? false;
  });
  syncSecrets() {
    this.systemApi
      .repositoryRefresh(this.data().id, true, false)
      .subscribe({
        next: () => {
          this.openSnackBar('Sync of secrets queued');
        },
        error: (err: any) => {
          this.openSnackBar(
            'Syncing secrets failed: ' + (err?.statusText ?? 'unknown'),
          );
        },
      });
  }

  syncUsers() {
    this.systemApi
      .repositoryRefresh(this.data().id, false, true)
      .subscribe({
        next: () => {
          this.openSnackBar('Sync of users queued');
        },
        error: (err: any) => {
          this.openSnackBar(
            'Syncing users failed: ' + (err?.statusText ?? 'unknown'),
          );
        },
      });
  }

  showSecretsQueued() {
    const status = this.data().syncSecretsStatus;
    return !!(
      status?.queuedAt &&
      (!status?.syncAt ||
        status?.queuedAt >
        status?.syncAt)
    );
  }

  showUsersQueued() {
    const status = this.data().syncUsersStatus;
    return !!(
      status?.queuedAt &&
      (!status?.syncAt ||
        status?.queuedAt >
        status?.syncAt)
    );
  }

  showGitHubRoleMappings() {
    this.dialog
      .open(GithubRoleMappingDialogComponent, {
        width: '600px',
        data: {},
      })
      .afterClosed()
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .subscribe(() => {});
  }

  showGitHubSecrets() {
    this.dialog
      .open(GithubSecretsDialogComponent, {
        width: '600px',
        data: {},
      })
      .afterClosed()
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .subscribe(() => {});
  }

  private openSnackBar(message: string) {
    const config = new MatSnackBarConfig();
    config.duration = 5000;
    config.verticalPosition = 'bottom';
    this.snackBar.open(message, 'Dismiss', config);
  }
}
