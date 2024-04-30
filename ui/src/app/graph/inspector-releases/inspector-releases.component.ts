import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-inspector-releases',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDividerModule, MatTableModule],
  templateUrl: './inspector-releases.component.html',
  styleUrl: './inspector-releases.component.scss',
})
export class InspectorReleasesComponent {
  @Input() builds!: any;
  total = 0;

  propDisplayedColumns: string[] = ['name', 'version'];

  navigateByService() {
    console.log('navigateByService');
  }

  // private loadBuilds() {
  //   this.buildApi.searchBuilds(this.id, 0, 5);
  // }
}
