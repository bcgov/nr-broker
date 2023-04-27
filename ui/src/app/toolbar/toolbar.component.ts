import { Component, Inject } from '@angular/core';
import { CURRENT_USER } from '../app-initialize.factory';
import { UserDto } from '../graph/graph.types';
import { environment } from '../../environments/environment';
import { MatDialog } from '@angular/material/dialog';
import { RolesDialogComponent } from './roles-dialog/roles-dialog.component';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
})
export class ToolbarComponent {
  constructor(
    private dialog: MatDialog,
    @Inject(CURRENT_USER) public user: UserDto,
  ) {}

  showRolesDialog() {
    this.dialog.open(RolesDialogComponent, {
      width: '400px',
    });
  }

  logout() {
    window.location.href = `${environment.apiUrl}/auth/logout`;
  }
}
