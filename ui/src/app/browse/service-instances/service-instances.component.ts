import {
  Component,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { lastValueFrom } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { CURRENT_USER } from '../../app-initialize.factory';
import {
  InspectorInstanceDialogComponent,
  InspectorInstanceDialogReturnDao,
} from '../../graph/inspector-instance-dialog/inspector-instance-dialog.component';
import { GraphApiService } from '../../service/graph-api.service';
import { ServiceRestDto } from '../../service/dto/service-rest.dto';
import { PermissionService } from '../../service/permission.service';
import { VertexRestDto } from '../../service/dto/vertex-rest.dto';
import { GraphDirectedRestCombo } from '../../service/dto/collection-combo-rest.dto';
import { CollectionApiService } from '../../service/collection-api.service';
import { EnvironmentRestDto } from '../../service/dto/environment-rest.dto';
import { ServiceInstanceDetailsComponent } from '../service-instance-details/service-instance-details.component';
import { CollectionUtilService } from '../../service/collection-util.service';
import { UserSelfRestDto } from '../../service/dto/user-rest.dto';

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
  ],
  templateUrl: './service-instances.component.html',
  styleUrl: './service-instances.component.scss',
})
export class ServiceInstancesComponent implements OnChanges {
  @Input() vertex!: VertexRestDto;
  @Input() vertices!: GraphDirectedRestCombo[];
  @Input() service!: ServiceRestDto;
  @Input() details!: any;
  @Output() refreshData = new EventEmitter();

  envDetailsMap: any;
  envDetailSelection: any;
  envs: EnvironmentRestDto[] = [];
  loading = true;

  constructor(
    public readonly permission: PermissionService,
    private readonly dialog: MatDialog,
    private readonly graphApi: GraphApiService,
    private readonly collectionApi: CollectionApiService,
    private readonly collectionUtil: CollectionUtilService,
    @Inject(CURRENT_USER) public readonly user: UserSelfRestDto,
  ) {}

  ngOnInit(): void {
    this.collectionApi.exportCollection('environment').subscribe((envArr) => {
      envArr.sort((a, b) => a.position - b.position);
      this.envs = envArr;
    });
    this.loadServiceDetails();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['details']) {
      this.loadServiceDetails();
    }
  }

  openInstance(id: string) {
    this.collectionUtil.openInBrowser('serviceInstance', id);
  }

  openInstanceDialog() {
    if (!this.vertices) {
      return;
    }
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
                source: this.vertex.id as string,
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
      this.loading = false;
    }
  }
}
