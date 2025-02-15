import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { RepositoryDto } from '../../service/persistence/dto/repository.dto';
import { SystemApiService } from '../../service/system-api.service';
import { HealthStatusService } from '../../service/health-status.service';

@Component({
  selector: 'app-inspector-repository-sync',
  imports: [CommonModule, MatButtonModule, MatTooltipModule],
  templateUrl: './inspector-repository-sync.component.html',
  styleUrl: './inspector-repository-sync.component.scss',
})
export class InspectorRepositorySyncComponent {
  @Input() repository!: RepositoryDto;
  @Input() hasSudo = false;
  @Input() header: 'small' | 'large' = 'small';

  constructor(
    private readonly snackBar: MatSnackBar,
    private readonly systemApi: SystemApiService,
    public readonly healthStatus: HealthStatusService,
  ) {}

  syncSecrets() {
    this.systemApi
      .repositoryRefresh(this.repository.id, true, false)
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
      .repositoryRefresh(this.repository.id, false, true)
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
    return !!(
      this.repository.syncSecretsStatus?.queuedAt &&
      (!this.repository.syncSecretsStatus?.syncAt ||
        this.repository.syncSecretsStatus?.queuedAt >
          this.repository.syncSecretsStatus?.syncAt)
    );
  }

  showUsersQueued() {
    return !!(
      this.repository.syncUsersStatus?.queuedAt &&
      (!this.repository.syncUsersStatus?.syncAt ||
        this.repository.syncUsersStatus?.queuedAt >
          this.repository.syncUsersStatus?.syncAt)
    );
  }

  private openSnackBar(message: string) {
    const config = new MatSnackBarConfig();
    config.duration = 5000;
    config.verticalPosition = 'bottom';
    this.snackBar.open(message, 'Dismiss', config);
  }
}
