import { CommonModule } from '@angular/common';
import { Component, input, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

import { RepositoryDto } from '../../service/persistence/dto/repository.dto';
import { SystemApiService } from '../../service/system-api.service';
import { HealthStatusService } from '../../service/health-status.service';
import { GithubRoleMappingDialogComponent } from '../github-role-mapping-dialog/github-role-mapping-dialog.component';
import { GithubSecretsDialogComponent } from '../github-secrets-dialog/github-secrets-dialog.component';
import { DetailsItemComponent } from '../../shared/details-item/details-item.component';

@Component({
  selector: 'app-inspector-repository-sync',
  imports: [
    CommonModule,
    MatButtonModule,
    MatTooltipModule,
    DetailsItemComponent,
  ],
  templateUrl: './inspector-repository-sync.component.html',
  styleUrl: './inspector-repository-sync.component.scss',
})
export class InspectorRepositorySyncComponent {
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly systemApi = inject(SystemApiService);
  readonly healthStatus = inject(HealthStatusService);

  readonly repository = input.required<RepositoryDto>();
  readonly hasSudo = input(false);
  readonly header = input<'small' | 'large'>('small');

  syncSecrets() {
    this.systemApi
      .repositoryRefresh(this.repository().id, true, false)
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
      .repositoryRefresh(this.repository().id, false, true)
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
    const status = this.repository().syncSecretsStatus;
    return !!(
      status?.queuedAt &&
      (!status?.syncAt ||
        status?.queuedAt >
        status?.syncAt)
    );
  }

  showUsersQueued() {
    const status = this.repository().syncUsersStatus;
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
