import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-inspector-account-table',
  imports: [
    CommonModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './inspector-account-table.component.html',
  styleUrl: './inspector-account-table.component.scss',
})
export class InspectorAccountTableComponent {
  readonly display = input.required<'table' | 'details'>();
  readonly tokenData = input.required<any>();
  readonly showHelp = input.required<boolean>();

  propDisplayedColumns: string[] = ['key', 'value'];

  isDateExpired(test: Date) {
    return Date.now() > test.valueOf();
  }
}
