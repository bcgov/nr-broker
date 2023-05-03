import { Component, EventEmitter, Inject, Output } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDialog } from '@angular/material/dialog';
import { CURRENT_USER } from '../app-initialize.factory';
import { UserDto } from '../graph/graph.types';
import { environment } from '../../environments/environment';
import { RolesDialogComponent } from './roles-dialog/roles-dialog.component';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
  standalone: true,
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
  ],
})
export class ToolbarComponent {
  @Output() sidebarClick = new EventEmitter<boolean>();

  constructor(
    private dialog: MatDialog,
    @Inject(CURRENT_USER) public user: UserDto,
  ) {}

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
