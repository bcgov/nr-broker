import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { ChartClickTarget } from '../../service/graph.types';
import { GraphApiService } from '../../service/graph-api.service';

@Component({
  selector: 'app-inspector-installs',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDividerModule, MatListModule],
  templateUrl: './inspector-installs.component.html',
  styleUrls: ['./inspector-installs.component.scss'],
})
export class InspectorInstallsComponent implements OnChanges {
  @Input() target!: ChartClickTarget | undefined;
  intentions: any[] = [];
  total = 0;

  constructor(private graphApi: GraphApiService, private router: Router) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['target']) {
      // this.loadIntentions();
    }
  }
}
