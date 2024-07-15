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
} from '../inspector-instance-dialog/inspector-instance-dialog.component';
import { GraphApiService } from '../../service/graph-api.service';
import { ServiceRestDto } from '../../service/dto/service-rest.dto';
import { InspectorInstallsComponent } from '../inspector-installs/inspector-installs.component';
import { OutcomeIconComponent } from '../../shared/outcome-icon/outcome-icon.component';
import { PermissionService } from '../../service/permission.service';
import { VertexRestDto } from '../../service/dto/vertex-rest.dto';
import { GraphDirectedRestCombo } from '../../service/dto/collection-combo-rest.dto';

@Component({
  selector: 'app-inspector-instances',
  standalone: true,
  imports: [
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatTableModule,
    InspectorInstallsComponent,
    InspectorInstanceDialogComponent,
    OutcomeIconComponent,
  ],
  templateUrl: './inspector-instances.component.html',
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
  styleUrl: './inspector-instances.component.scss',
})
export class InspectorInstancesComponent implements OnChanges {
  @Input() vertex!: VertexRestDto;
  @Input() vertices!: GraphDirectedRestCombo[];
  @Input() service!: ServiceRestDto;
  @Input() details!: any;
  data: any;
  tableData: any[] = [];
  environments: any[] = [];
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
    @Inject(CURRENT_USER) public readonly user: UserDto,
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['details']) {
      this.loadServiceDetails();
    }
  }

  isGroup(index: any, item: any): boolean {
    return item.isGroup;
  }
  isNotGroup(index: any, item: any): boolean {
    return !item.isGroup;
  }

  private loadServiceDetails() {
    if (this.details) {
      const data = this.details;
      this.data = data.serviceInstance.reduce((pv: any, cv: any) => {
        const env = cv.environment.name;
        if (pv[env]) {
          pv[env].push(cv);
        } else {
          pv[env] = [cv];
        }
        return pv;
      }, {});
      this.environments = Object.values(this.data)
        .map((instanceDetialsArr: any) => instanceDetialsArr[0].environment)
        .sort((a, b) => a.position - b.position);
      this.tableData = [];
      for (const env of this.environments) {
        this.tableData.push(
          {
            isGroup: true,
            env,
          },
          ...this.data[env.name],
        );
      }
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
