import { Component, Inject } from '@angular/core';
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
export class GithubRoleMappingDialogComponent {
  displayedColumns: string[] = ['edge', 'role'];

  dataSource: GitHubEdgeToRoles[] = [];

  constructor(
    @Inject(CONFIG_RECORD)
    public readonly configRecord: CollectionConfigNameRecord,
  ) {}

  ngOnInit() {
    if (this.configRecord['user'].edgeToRoles) {
      this.dataSource = this.configRecord['user'].edgeToRoles;
    }
  }
}
