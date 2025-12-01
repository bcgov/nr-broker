import { Component, output, input, inject, signal, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { lastValueFrom } from 'rxjs';
import { CURRENT_USER } from '../../app-initialize.factory';
import {
  InspectorInstanceDialogComponent,
  InspectorInstanceDialogReturnDao,
} from '../inspector-instance-dialog/inspector-instance-dialog.component';
import { GraphApiService } from '../../service/graph-api.service';
import { ServiceDto } from '../../service/persistence/dto/service.dto';
import { InspectorInstallsComponent } from '../inspector-installs/inspector-installs.component';
import { OutcomeIconComponent } from '../../shared/outcome-icon/outcome-icon.component';
import { PermissionService } from '../../service/permission.service';
import { VertexDto } from '../../service/persistence/dto/vertex.dto';
import { GraphDirectedCombo } from '../../service/persistence/dto/collection-combo.dto';
import { UserSelfDto } from '../../service/persistence/dto/user.dto';

@Component({
  selector: 'app-inspector-instances',
  imports: [
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatTableModule,
    InspectorInstallsComponent,
    OutcomeIconComponent,
  ],
  templateUrl: './inspector-instances.component.html',
  styleUrl: './inspector-instances.component.scss',
})
export class InspectorInstancesComponent {
  readonly permission = inject(PermissionService);
  private readonly dialog = inject(MatDialog);
  private readonly graphApi = inject(GraphApiService);
  readonly user = inject<UserSelfDto>(CURRENT_USER);

  readonly service = input.required<ServiceDto>();
  readonly vertex = input.required<VertexDto>();
  readonly vertices = input.required<GraphDirectedCombo[]>();
  readonly details = input.required<any>();

  readonly data = computed(() => {
    return this.details().serviceInstance.reduce((pv: any, cv: any) => {
      const env = cv.environment.name;

      if (pv[env]) {
        pv[env].push(cv);
      } else {
        pv[env] = [cv];
      }
      return pv;
    }, {});
  });
  environments = computed(() => {
    return Object.values(this.data())
      .map((instanceDetialsArr: any) => instanceDetialsArr[0].environment)
      .sort((a, b) => a.position - b.position);
  });
  tableData = computed(() => {
    const tableData: any[] = [];
    for (const env of this.environments()) {
      tableData.push(
        {
          isGroup: true,
          env,
        },
        ...this.data()[env.name],
      );
    };
    return tableData;
  });
  loading = signal(false);
  readonly refreshData = output();

  propDisplayedColumns: string[] = ['outcome', 'version'];
  propDisplayedColumnsWithExpand: string[] = [
    ...this.propDisplayedColumns,
    'expand',
  ];
  expandedElement = signal<any | null>(null);

  isGroup(index: any, item: any): boolean {
    return item.isGroup;
  }

  isNotGroup(index: any, item: any): boolean {
    return !item.isGroup;
  }

  openInstanceDialog() {
    const vertices = this.vertices();
    if (!vertices) {
      return;
    }
    this.dialog
      .open(InspectorInstanceDialogComponent, {
        width: '500px',
        data: {
          vertices: vertices,
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
                source: this.vertex().id as string,
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
