import { Component, Inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { UserDto } from '../../service/graph.types';
import { CURRENT_USER } from '../../app-initialize.factory';
import { AccountGenerateDialogComponent } from '../account-generate-dialog/account-generate-dialog.component';

@Component({
  selector: 'app-inspector-account',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './inspector-account.component.html',
  styleUrls: ['./inspector-account.component.scss'],
})
export class InspectorAccountComponent {
  @Input() account!: any;

  constructor(
    private dialog: MatDialog,
    @Inject(CURRENT_USER) public user: UserDto,
  ) {}

  openGenerateDialog() {
    this.dialog.open(AccountGenerateDialogComponent, {
      width: '600px',
      data: {
        accountId: this.account.id,
      },
    });
    console.log('openGenerateDialog');
  }
}
