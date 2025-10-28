import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';

import { CURRENT_USER } from '../../app-initialize.factory';
import { UserSelfDto } from '../../service/persistence/dto/user.dto';
@Component({
  selector: 'app-roles-dialog',
  templateUrl: './roles-dialog.component.html',
  styleUrls: ['./roles-dialog.component.scss'],
  imports: [MatDialogModule, MatButtonModule, MatListModule],
})
export class RolesDialogComponent {
  readonly user = inject<UserSelfDto>(CURRENT_USER);
}
