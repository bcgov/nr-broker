import { Component, input, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { combineLatest, filter, lastValueFrom } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute } from '@angular/router';
import { httpResource } from '@angular/common/http';
import { toObservable } from '@angular/core/rxjs-interop';

import { CONFIG_RECORD, CURRENT_USER } from '../../app-initialize.factory';
import {
  InspectorInstanceDialogComponent,
  InspectorInstanceDialogReturnDao,
} from '../../graph/inspector-instance-dialog/inspector-instance-dialog.component';
import { GraphApiService } from '../../service/graph-api.service';
import { ServiceDto } from '../../service/persistence/dto/service.dto';
import { PermissionService } from '../../service/permission.service';
import { VertexDto } from '../../service/persistence/dto/vertex.dto';
import { GraphDirectedCombo } from '../../service/persistence/dto/collection-combo.dto';
import { CollectionApiService } from '../../service/collection-api.service';
import { EnvironmentDto } from '../../service/persistence/dto/environment.dto';
import { ServiceInstanceDetailsComponent } from '../service-instance-details/service-instance-details.component';
import { CollectionUtilService } from '../../service/collection-util.service';
import { UserSelfDto } from '../../service/persistence/dto/user.dto';
import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';
import { CollectionHeaderComponent } from '../../shared/collection-header/collection-header.component';
import { CollectionConfigNameRecord } from '../../service/graph.types';
import { ScreenService } from '../../util/screen.service';

@Component({
  selector: 'app-service-instances',
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTableModule,
    ServiceInstanceDetailsComponent,
    CollectionHeaderComponent,
  ],
  templateUrl: './service-instances.component.html',
  styleUrl: './service-instances.component.scss',
})
export class ServiceInstancesComponent {
  private readonly activatedRoute = inject(ActivatedRoute);
  readonly permission = inject(PermissionService);
  private readonly dialog = inject(MatDialog);
  private readonly graphApi = inject(GraphApiService);
  private readonly collectionApi = inject(CollectionApiService);
  private readonly collectionUtil = inject(CollectionUtilService);
  readonly user = inject<UserSelfDto>(CURRENT_USER);
  readonly configMap = inject<CollectionConfigNameRecord>(CONFIG_RECORD);
  readonly screen = inject(ScreenService);

  collection = signal<CollectionNames>('service');
  serviceId = signal('');
  name = signal('');
  loading = signal(true);

  public comboDataResource = httpResource(() => {
    return this.collectionApi.getCollectionComboByIdArgs(
      this.collection(),
      this.serviceId(),
    );
  });
  public comboDataResource$ = toObservable<any>(
    this.comboDataResource.asReadonly().value,
  ).pipe(filter((data) => !!data));

  readonly vertex = signal<VertexDto | undefined>(undefined);
  readonly vertices = signal<GraphDirectedCombo[]>([]);
  readonly service = input.required<ServiceDto>();

  details: any;
  envDetailsMap: any;
  envDetailSelection: any;
  envs: EnvironmentDto[] = [];

  constructor() {
    this.activatedRoute.params.subscribe((params) => {
      this.serviceId.set(params['id']);
      combineLatest([
        this.collectionApi.getCollectionById('service', this.serviceId()),
        this.collectionApi
          .getServiceDetails(this.serviceId()),
        this.collectionApi.exportCollection('environment'),
        this.comboDataResource$,
      ]).subscribe(([service, data, envArr, comboData]) => {
        this.name.set(service.name);
        this.details = data;
        this.envs = envArr;
        this.loadServiceDetails();
        this.vertex.set(comboData.vertex as VertexDto);
        this.vertices.set(comboData.downstream);
        this.loading.set(false);
        // this.vertex.set(service.vertex);
        // console.log('Service build details', data);
      });
    });
  }

  openInstance(id: string) {
    this.collectionUtil.openInBrowser('serviceInstance', id);
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
                source: this.vertex()?.id as string,
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
          // this.refreshData.emit();
        }
      });
  }

  private loadServiceDetails() {
    if (this.details) {
      const data = this.details;
      this.envDetailsMap = data.serviceInstance.reduce((pv: any, cv: any) => {
        const env = cv.environment.name;
        if (pv[env]) {
          pv[env].push(cv);
        } else {
          pv[env] = [cv];
        }
        return pv;
      }, {});
      this.envDetailSelection = data.serviceInstance.reduce(
        (pv: any, cv: any) => {
          const env = cv.environment.name;
          if (!pv[env]) {
            pv[env] = cv;
          }
          return pv;
        },
        {},
      );
    }
  }
}
