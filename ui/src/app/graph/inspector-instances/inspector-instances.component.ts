import { Component, EventEmitter, Inject, Input, Output } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { UserDto, VertexNavigation } from '../../service/graph.types';
import { CURRENT_USER } from '../../app-initialize.factory';
import {
  InspectorInstanceDialogComponent,
  InspectorInstanceDialogReturnDao,
} from '../inspector-instance-dialog/inspector-instance-dialog.component';
import { GraphApiService } from '../../service/graph-api.service';

@Component({
  selector: 'app-inspector-instances',
  standalone: true,
  imports: [
    MatButtonModule,
    MatDividerModule,
    InspectorInstanceDialogComponent,
  ],
  templateUrl: './inspector-instances.component.html',
  styleUrl: './inspector-instances.component.scss',
})
export class InspectorInstancesComponent {
  @Input() vertices!: VertexNavigation | null;
  @Output() refreshData = new EventEmitter();

  constructor(
    @Inject(CURRENT_USER) public readonly user: UserDto,
    private readonly dialog: MatDialog,
    private readonly graphApi: GraphApiService,
  ) {}

  openInstanceDialog() {
    this.dialog
      .open(InspectorInstanceDialogComponent, {
        width: '500px',
        data: {
          vertices: this.vertices,
        },
      })
      .afterClosed()
      .subscribe(async (result: InspectorInstanceDialogReturnDao[]) => {
        let refresh = false;
        for (const env of result) {
          const addAliases = env.aliases.filter(
            (alias) => !alias.disabled && alias.checked,
          );
          for (const addAlias of addAliases) {
            refresh = true;
            const vertex = await lastValueFrom(
              this.graphApi.addVertex({
                collection: 'serviceInstance',
                data: {
                  name: addAlias.name,
                },
              }),
            );

            await lastValueFrom(
              this.graphApi.addEdge({
                name: 'instance',
                source: this.vertices?.vertex.id as string,
                target: vertex.id,
              }),
            );

            await lastValueFrom(
              this.graphApi.addEdge({
                name: 'deploy-type',
                source: vertex.id,
                target: env.vertex,
              }),
            );
          }
        }
        if (refresh) {
          this.refreshData.emit();
        }
      });
  }
}
