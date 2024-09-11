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
import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { lastValueFrom } from 'rxjs';
import { UserDto } from '../../service/graph.types';
import { CURRENT_USER } from '../../app-initialize.factory';
import {
  InspectorInstanceDialogComponent,
  InspectorInstanceDialogReturnDao,
} from '../../graph/inspector-instance-dialog/inspector-instance-dialog.component';
import { GraphApiService } from '../../service/graph-api.service';
import { ServiceRestDto } from '../../service/dto/service-rest.dto';
import { InspectorInstallsComponent } from '../../graph/inspector-installs/inspector-installs.component';
import { OutcomeIconComponent } from '../../shared/outcome-icon/outcome-icon.component';
import { PermissionService } from '../../service/permission.service';
import { VertexRestDto } from '../../service/dto/vertex-rest.dto';
import { GraphDirectedRestCombo } from '../../service/dto/collection-combo-rest.dto';
import { CollectionApiService } from '../../service/collection-api.service';
import { EnvironmentRestDto } from '../../service/dto/environment-rest.dto';
import { MatCardModule } from '@angular/material/card';
import { ServiceInstanceDetailsComponent } from '../service-instance-details/service-instance-details.component';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-service-instances',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatSelectModule,
    MatTableModule,
    InspectorInstallsComponent,
    InspectorInstanceDialogComponent,
    ServiceInstanceDetailsComponent,
    OutcomeIconComponent,
  ],
  templateUrl: './service-instances.component.html',
  animations: [
    trigger('detailExpand', [
      state('collapsed,void', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition(
        'expanded <=> collapsed',
        animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)'),
      ),
    ]),
  ],
  styleUrl: './service-instances.component.scss',
})
export class ServiceInstancesComponent implements OnChanges {
  @Input() vertex!: VertexRestDto;
  @Input() vertices!: GraphDirectedRestCombo[];
  @Input() service!: ServiceRestDto;
  @Input() details!: any;
  envDetailsMap: any;
  envDetailSelection: any;
  envs: EnvironmentRestDto[] = [];
  loading = true;
  @Output() refreshData = new EventEmitter();

  propDisplayedColumns: string[] = ['outcome', 'version'];
  propDisplayedColumnsWithExpand: string[] = [
    ...this.propDisplayedColumns,
    'expand',
  ];
  expandedElement: any | null;

  constructor(
    public readonly permission: PermissionService,
    private readonly dialog: MatDialog,
    private readonly graphApi: GraphApiService,
    private readonly collectionApi: CollectionApiService,
    @Inject(CURRENT_USER) public readonly user: UserDto,
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
}
