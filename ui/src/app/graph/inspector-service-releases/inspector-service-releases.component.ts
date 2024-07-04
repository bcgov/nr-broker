import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-inspector-service-releases',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDividerModule, MatTableModule],
  templateUrl: './inspector-service-releases.component.html',
  styleUrl: './inspector-service-releases.component.scss',
})
export class InspectorServiceReleasesComponent {
  @Input() builds!: any;
  @Input() isApprover!: boolean;

  propDisplayedColumns: string[] = ['name', 'date', 'version'];
}
