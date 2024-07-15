import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { InspectorTeamComponent } from '../../graph/inspector-team/inspector-team.component';
import { GraphDirectedRestCombo } from '../../service/dto/collection-combo-rest.dto';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-team-members',
  standalone: true,
  imports: [CommonModule, InspectorTeamComponent, MatTableModule],
  templateUrl: './team-members.component.html',
  styleUrl: './team-members.component.scss',
})
export class TeamMembersComponent implements OnInit, OnChanges {
  @Input() collectionData: any;
  @Input() upstream!: GraphDirectedRestCombo[];
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
