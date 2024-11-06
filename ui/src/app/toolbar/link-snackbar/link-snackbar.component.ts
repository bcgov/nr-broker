import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MatSnackBarAction,
  MatSnackBarActions,
  MatSnackBarLabel,
  MatSnackBarRef,
} from '@angular/material/snack-bar';
import { SystemApiService } from '../../service/system-api.service';
import { PreferencesService } from '../../preferences.service';

@Component({
  selector: 'app-link-snackbar',
  standalone: true,
  imports: [
    MatButtonModule,
    MatSnackBarLabel,
    MatSnackBarActions,
    MatSnackBarAction,
  ],
  templateUrl: './link-snackbar.component.html',
  styleUrl: './link-snackbar.component.scss',
})
export class LinkSnackbarComponent {
  snackBarRef = inject(MatSnackBarRef);

  constructor(
    private readonly systemApi: SystemApiService,
    private readonly preferences: PreferencesService,
  ) {}

  public async dismiss() {
    this.snackBarRef.dismissWithAction();
    this.preferences.set('ignoreGitHubLink', true);
  }

  public async linkGitHubAccount() {
    this.dismiss();
    this.systemApi.userLinkGithub().subscribe({
      next: (data) => {
        window.location.href = data.url;
      },
      error: (err: any) => {
        console.log(err);
      },
    });
  }
}
