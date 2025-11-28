import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { CONFIG_RECORD } from '../../app-initialize.factory';
import { CollectionConfigNameRecord } from '../../service/graph.types';
import { GitHubEdgeToRoles } from '../../service/persistence/dto/collection-config.dto';

@Component({
  selector: 'app-github-role-mapping-dialog',
  imports: [MatDialogModule, MatButtonModule, MatTableModule],
  templateUrl: './github-role-mapping-dialog.component.html',
  styleUrl: './github-role-mapping-dialog.component.scss',
})
export class GithubRoleMappingDialogComponent implements OnInit {
  readonly configRecord = inject<CollectionConfigNameRecord>(CONFIG_RECORD);

  displayedColumns: string[] = ['edge', 'role'];

  dataSource = signal<GitHubEdgeToRoles[]>([]);

  ngOnInit() {
    if (this.configRecord['user'].edgeToRoles) {
      this.dataSource.set(this.configRecord['user'].edgeToRoles);
    }
  }
}
