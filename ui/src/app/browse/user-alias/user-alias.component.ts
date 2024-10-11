import { Component, Inject, Input, OnChanges } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { SystemApiService } from '../../service/system-api.service';
import { CURRENT_USER } from '../../app-initialize.factory';
import { UserDto } from '../../service/graph.types';
import { HealthStatusService } from '../../service/health-status.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-alias',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './user-alias.component.html',
  styleUrl: './user-alias.component.scss',
})
export class UserAliasComponent implements OnChanges {
  @Input() collection: any;

  isSelf = false;

  constructor(
    private readonly systemApi: SystemApiService,
    public readonly healthStatus: HealthStatusService,
    @Inject(CURRENT_USER) public readonly user: UserDto,
  ) {}

  ngOnChanges(): void {
    this.isSelf = this.user.vertex === this.collection?.vertex;
  }

  public async linkGitHubAccount() {
    this.systemApi.userLinkGithub().subscribe({
      next: (data) => {
        window.location.href = data.url;
      },
      error: (err: any) => {
        console.log(err);
        // this.openSnackBar(
        //   'Syncing token failed: ' + (err?.statusText ?? 'unknown'),
        // );
      },
    });
  }
}
