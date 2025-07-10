import { Component, Inject, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { SystemApiService } from '../../service/system-api.service';
import { CURRENT_USER } from '../../app-initialize.factory';
import { HealthStatusService } from '../../service/health-status.service';
import { UserSelfDto } from '../../service/persistence/dto/user.dto';
import { DetailsItemComponent } from '../../shared/details-item/details-item.component';

@Component({
  selector: 'app-user-alias',
  imports: [CommonModule, MatButtonModule, DetailsItemComponent],
  templateUrl: './user-alias.component.html',
  styleUrl: './user-alias.component.scss',
})
export class UserAliasComponent implements OnChanges {
  // TODO: Skipped for migration because:
  //  This input is used in a control flow expression (e.g. `@if` or `*ngIf`)
  //  and migrating would break narrowing currently.
  @Input() collection: any;

  isSelf = false;

  constructor(
    private readonly systemApi: SystemApiService,
    public readonly healthStatus: HealthStatusService,
    @Inject(CURRENT_USER) public readonly user: UserSelfDto,
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
