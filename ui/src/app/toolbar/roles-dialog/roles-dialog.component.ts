import { Component, Inject } from '@angular/core';
import { CURRENT_USER } from '../../app-initialize.factory';
import { UserDto } from '../../graph/graph.types';

@Component({
  selector: 'app-roles-dialog',
  templateUrl: './roles-dialog.component.html',
  styleUrls: ['./roles-dialog.component.scss'],
})
export class RolesDialogComponent {
  constructor(@Inject(CURRENT_USER) public user: UserDto) {}
}
