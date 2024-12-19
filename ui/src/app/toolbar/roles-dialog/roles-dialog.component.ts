import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

import { CURRENT_USER } from '../../app-initialize.factory';
import { UserSelfDto } from '../../service/persistence/dto/user.dto';
@Component({
  selector: 'app-roles-dialog',
  templateUrl: './roles-dialog.component.html',
  styleUrls: ['./roles-dialog.component.scss'],
  imports: [MatDialogModule, MatButtonModule],
})
export class RolesDialogComponent {
  constructor(@Inject(CURRENT_USER) public readonly user: UserSelfDto) {}
}
