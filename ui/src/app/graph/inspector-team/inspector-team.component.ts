import { Component, output, input, inject } from '@angular/core';

import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MemberDialogComponent } from '../../team/member-dialog/member-dialog.component';

@Component({
  selector: 'app-inspector-team',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './inspector-team.component.html',
  styleUrls: ['./inspector-team.component.scss'],
})
export class InspectorTeamComponent {
  private readonly dialog = inject(MatDialog);

  readonly vertex = input.required<any | undefined>();
  readonly name = input.required<any | undefined>();
  readonly screenSize = input.required<string>();
  readonly graphChanged = output<boolean>();

  openMemberDialog() {
    const vertex = this.vertex();
    const name = this.name();
    if (!vertex && !name) {
      return;
    }
    this.dialog
      .open(MemberDialogComponent, {
        width: '600px',
        data: {
          vertex: vertex,
          name: name,
        },
      })
      .afterClosed()
      .subscribe(() => {
        this.graphChanged.emit(true);
      });
  }
}
