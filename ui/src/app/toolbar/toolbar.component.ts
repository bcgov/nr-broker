import {
  Component,
  OnInit,
  OnDestroy,
  EventEmitter,
  Inject,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDialog } from '@angular/material/dialog';
import { CURRENT_USER } from '../app-initialize.factory';
import { UserDto } from '../service/graph.types';
import { environment } from '../../environments/environment';
import { RolesDialogComponent } from './roles-dialog/roles-dialog.component';
import { HealthStatusService } from '../service/health-status.service';
import { interval, Subject } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { SearchInputComponent } from './search-input/search-input.component';
import { CollectionUtilService } from '../service/collection-util.service';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
  standalone: true,
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
  @Output() sidebarClick = new EventEmitter<boolean>();

  constructor(
    private readonly dialog: MatDialog,
    private readonly healthService: HealthStatusService,
    private readonly collectionUtil: CollectionUtilService,
    @Inject(CURRENT_USER) public readonly user: UserDto,
  ) {}

  healthStatus: boolean | undefined;
  private unsubscribe = new Subject<void>();
  isHovered: boolean | undefined;
  statusText: string | undefined;

  ngOnInit(): void {
    try {
      interval(60000)
        .pipe(takeUntil(this.unsubscribe))
        .subscribe(() => {
          this.getHealthCheck();
        });
    } catch (error: any) {
      this.healthStatus = false;
    }

    // Initial health check
    this.getHealthCheck();
  }

  ngOnDestroy(): void {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }

  getHealthCheck(): any {
    try {
      this.healthService.health$
        .pipe(
          catchError((error: any) => {
            this.healthStatus = false;
            throw error;
          }),
        )
        .subscribe((data: any) => {
          if (data === null) {
            this.healthStatus = false;
          } else {
            this.healthStatus = data.status === 'ok';
          }
        });
    } catch (error: any) {
      this.healthStatus = false;
    }
  }

  showStatusText(isHovered: boolean) {
    this.isHovered = isHovered;
    this.statusText = this.healthStatus ? 'Online' : 'Offline';
  }

  showUser() {
    this.collectionUtil.openInBrowserByVertexId('user', this.user.vertex);
  }

  showRolesDialog() {
    this.dialog.open(RolesDialogComponent, {
      width: '400px',
    });
  }

  openSidebar() {
    this.sidebarClick.emit(true);
  }

  logout() {
    window.location.href = `${environment.apiUrl}/auth/logout`;
  }
}
