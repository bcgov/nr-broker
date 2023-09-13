import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { NgIf, NgFor } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { CURRENT_USER } from '../../app-initialize.factory';
import { UserDto } from '../../service/graph.types';
@Component({
  selector: 'app-roles-dialog',
  templateUrl: './roles-dialog.component.html',
  styleUrls: ['./roles-dialog.component.scss'],
  standalone: true,
  imports: [MatDialogModule, NgIf, NgFor, MatButtonModule],
})
export class RolesDialogComponent {
  constructor(@Inject(CURRENT_USER) public readonly user: UserDto) {}
}
