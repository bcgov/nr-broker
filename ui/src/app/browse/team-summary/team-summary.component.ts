import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { GraphDirectedCombo } from '../../service/dto/collection-combo.dto';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-team-summary',
  imports: [CommonModule, MatTableModule],
  templateUrl: './team-summary.component.html',
  styleUrl: './team-summary.component.scss',
})
export class TeamSummaryComponent implements OnInit, OnChanges {
  @Input() collectionData: any;
  @Input() upstream!: GraphDirectedCombo[];
  propDisplayedColumns: string[] = ['key', 'value'];

  public userData: { [key: string]: number } = {};

  ngOnInit() {
    this.updateUserData();
  }

  ngOnChanges(): void {
    this.updateUserData();
  }

  private updateUserData() {
    if (!this.countComboEdges) {
      this.userData = {};
      return;
    }
    this.userData = {
      Owners: this.countComboEdges(['owner']),
      Developers: this.countComboEdges(['developer', 'lead-developer']),
      Testers: this.countComboEdges(['tester']),
    };
  }

  private countComboEdges(names: string[]) {
    return this.upstream.filter(
      (combo) => names.indexOf(combo.edge.name) !== -1,
    ).length;
  }
}
