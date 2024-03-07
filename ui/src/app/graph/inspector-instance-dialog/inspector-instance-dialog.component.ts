import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { VertexNavigation } from '../../service/graph.types';
import { CollectionApiService } from '../../service/collection-api.service';

export interface InspectorInstanceDialogReturnDao {
  id: string;
  vertex: string;
  aliases: {
    name: string;
    checked: boolean;
    disabled: boolean;
  }[];
  title: string;
}

@Component({
  selector: 'app-inspector-instance-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
  ],
  templateUrl: './inspector-instance-dialog.component.html',
  styleUrl: './inspector-instance-dialog.component.scss',
})
export class InspectorInstanceDialogComponent implements OnInit {
  public envMap: InspectorInstanceDialogReturnDao[] = [];
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public readonly data: {
      vertices: VertexNavigation;
    },
    public readonly dialogRef: MatDialogRef<InspectorInstanceDialogComponent>,
    private readonly collectionApi: CollectionApiService,
  ) {}

  ngOnInit(): void {
    const instances = this.data.vertices.connections['instance'];
    const existing = instances
      ? instances.map((instance) => instance.vertex.name)
      : [];

    this.collectionApi.exportCollection('environment').subscribe((envArr) => {
      envArr.sort((a, b) => b.position - a.position);
      for (const env of envArr) {
        this.envMap.push({
          id: env.id,
          vertex: env.vertex,
          aliases: [
            ...env.aliases,
            ...(env.aliases.includes(env.name) ? [] : [env.name]),
          ].map((name) => ({
            name,
            checked: existing.indexOf(name) !== -1,
            disabled: existing.indexOf(name) !== -1,
          })),
          title: env.title,
        });
      }
    });
  }

  addInstances() {
    this.dialogRef.close(this.envMap);
  }
}
