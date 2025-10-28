import { Component, OnInit, OnDestroy, EventEmitter, Output, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDialog } from '@angular/material/dialog';
import { CURRENT_USER } from '../app-initialize.factory';
import { environment } from '../../environments/environment';
import { RolesDialogComponent } from './roles-dialog/roles-dialog.component';
import { HealthStatusService } from '../service/health-status.service';
import { of, Subject } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { SearchInputComponent } from './search-input/search-input.component';
import { CollectionUtilService } from '../service/collection-util.service';
import { UserSelfDto } from '../service/persistence/dto/user.dto';
import { PreferencesService } from '../preferences.service';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { LinkSnackbarComponent } from './link-snackbar/link-snackbar.component';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatToolbarModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    SearchInputComponent,
  ],
})
export class ToolbarComponent implements OnInit, OnDestroy {
  private readonly dialog = inject(MatDialog);
  private readonly healthService = inject(HealthStatusService);
  private readonly collectionUtil = inject(CollectionUtilService);
  private readonly preferences = inject(PreferencesService);
  private readonly snackBar = inject(MatSnackBar);
  readonly user = inject<UserSelfDto>(CURRENT_USER);

  @Output() readonly sidebarClick = new EventEmitter<boolean>();

  readonly healthStatus = signal<boolean | undefined>(undefined);
  readonly statusText = computed(() => {
    return this.healthStatus() ? 'Online' : 'Offline';
  });
  private showLinkDialog = false;
  private unsubscribe = new Subject<void>();

  ngOnInit(): void {
    if (!this.user.alias && !this.preferences.get('ignoreGitHubLink')) {
      this.showLinkDialog = true;
    }

    this.healthService.health$
      .pipe(
        takeUntil(this.unsubscribe),
        catchError(() => {
          return of(null);
        }),
      )
      .subscribe((data) => {
        if (data === null) {
          this.healthStatus.set(false);
        } else if (data === undefined) {
          this.healthStatus.set(undefined);
        } else {
          this.healthStatus.set(data.status === 'ok');
          if (this.showLinkDialog && data?.details['github']['alias']) {
            const config = new MatSnackBarConfig();
            config.verticalPosition = 'bottom';
            this.snackBar.openFromComponent(LinkSnackbarComponent, config);
          }
        }
      });
  }

  ngOnDestroy(): void {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }

  showUser() {
    this.collectionUtil.openInBrowserByVertexId('user', this.user.vertex);
  }

  showRolesDialog() {
    this.dialog.open(RolesDialogComponent, {
      width: '500px',
    });
  }

  openSidebar() {
    this.sidebarClick.emit(true);
  }

  logout() {
    window.location.href = `${environment.apiUrl}/auth/logout`;
  }
}
