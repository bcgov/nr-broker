import { Component, EventEmitter, Input, Output } from '@angular/core';

import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MemberDialogComponent } from '../../team/member-dialog/member-dialog.component';

@Component({
  selector: 'app-inspector-team',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './inspector-team.component.html',
  styleUrls: ['./inspector-team.component.scss'],
})
export class InspectorTeamComponent {
  @Input() instance!: any | undefined;
  @Input() screenSize!: string;
  @Output() graphChanged = new EventEmitter<boolean>();

  constructor(private readonly dialog: MatDialog) {}

  openMemberDialog() {
    if (!this.instance) {
      return;
    }
    this.dialog
      .open(MemberDialogComponent, {
        width: '600px',
        data: {
          id: this.instance.id,
          vertex: this.instance.vertex,
          name: this.instance.name,
        },
      })
      .afterClosed()
      .subscribe(() => {
        this.graphChanged.emit(true);
      });
  }
}
