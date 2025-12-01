import { Component, computed, inject, input, effect, numberAttribute, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { toObservable } from '@angular/core/rxjs-interop';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatMenuModule } from '@angular/material/menu';
import {
  MatSnackBar,
  MatSnackBarConfig,
  MatSnackBarModule,
} from '@angular/material/snack-bar';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import { Subject, combineLatest, filter, startWith, takeUntil } from 'rxjs';

import { GraphApiService } from '../../service/graph-api.service';
import { CollectionApiService } from '../../service/collection-api.service';
import { PermissionService } from '../../service/permission.service';
import { CONFIG_RECORD } from '../../app-initialize.factory';
import { CollectionConfigNameRecord } from '../../service/graph.types';

import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';
import { CollectionHeaderComponent } from '../../shared/collection-header/collection-header.component';
import { InspectorAccountComponent } from '../../graph/inspector-account/inspector-account.component';
import { InspectorTeamComponent } from '../../graph/inspector-team/inspector-team.component';
import { InspectorVertexFieldsComponent } from '../../graph/inspector-vertex-fields/inspector-vertex-fields.component';
import { VertexTagsComponent } from '../../graph/vertex-tags/vertex-tags.component';
import { TeamServicesComponent } from '../team-services/team-services.component';
import { TeamMembersComponent } from '../team-members/team-members.component';
import { InspectorConnectionsComponent } from '../../graph/inspector-connections/inspector-connections.component';
import { CollectionCombo } from '../../service/collection/dto/collection-search-result.dto';
import { CollectionUtilService } from '../../service/collection-util.service';
import { VertexDto } from '../../service/persistence/dto/vertex.dto';
import { EdgeDto } from '../../service/persistence/dto/edge.dto';
import { GraphUtilService } from '../../service/graph-util.service';
import { InspectorPropertiesComponent } from '../../graph/inspector-properties/inspector-properties.component';
import { InspectorTimestampsComponent } from '../../graph/inspector-timestamps/inspector-timestamps.component';
import { TeamRolesComponent } from '../team-roles/team-roles.component';
import { DeleteConfirmDialogComponent } from '../../graph/delete-confirm-dialog/delete-confirm-dialog.component';
import { TagDialogComponent } from '../../graph/tag-dialog/tag-dialog.component';
import { VertexDialogComponent } from '../../graph/vertex-dialog/vertex-dialog.component';
import { UserAliasComponent } from '../user-alias/user-alias.component';
import { ServiceInstanceDetailsResponseDto } from '../../service/persistence/dto/service-instance.dto';
import { InspectorRepositorySyncComponent } from '../../graph/inspector-repository-sync/inspector-repository-sync.component';
import { MemberDialogComponent } from '../../team/member-dialog/member-dialog.component';
import { GithubRoleMappingDialogComponent } from '../../graph/github-role-mapping-dialog/github-role-mapping-dialog.component';
import { HealthStatusService } from '../../service/health-status.service';
import { ScreenService } from '../../util/screen.service';
import { InspectorVaultComponent } from '../../graph/inspector-vault/inspector-vault.component';
import { InspectorServiceSecureComponent } from '../../graph/inspector-service-secure/inspector-service-secure.component';

@Component({
  selector: 'app-collection-inspector',
  imports: [
    CommonModule,
    ClipboardModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatGridListModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTabsModule,
    CollectionHeaderComponent,
    InspectorAccountComponent,
    InspectorTeamComponent,
    InspectorVertexFieldsComponent,
    InspectorConnectionsComponent,
    InspectorRepositorySyncComponent,
    InspectorPropertiesComponent,
    InspectorTimestampsComponent,
    InspectorVaultComponent,
    InspectorServiceSecureComponent,
    TeamMembersComponent,
    TeamServicesComponent,
    TeamRolesComponent,
    UserAliasComponent,
    VertexTagsComponent,
  ],
  templateUrl: './collection-inspector.component.html',
  styleUrl: './collection-inspector.component.scss',
})
export class CollectionInspectorComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly graphApi = inject(GraphApiService);
  private readonly graphUtil = inject(GraphUtilService);
  private readonly collectionApi = inject(CollectionApiService);
  private readonly permission = inject(PermissionService);
  private readonly configRecord = inject<CollectionConfigNameRecord>(CONFIG_RECORD);
  readonly collectionUtil = inject(CollectionUtilService);
  readonly healthStatus = inject(HealthStatusService);
  readonly screen = inject(ScreenService);

  // Url params
  public collection = input<CollectionNames>('project');
  public collectionId = input('');
  public selectedTabIndex = input(0, {
    transform: (v) => numberAttribute(v, 0),
    // eslint-disable-next-line @angular-eslint/no-input-rename
    alias: 'index',
  });

  // Loaded data
  hideLoading = signal(false);
  readonly config = computed(() => {
    return this.configRecord[this.collection()];
  });
  public comboData = signal<CollectionCombo<any> | null>(null);
  public comboDataResource = httpResource(() => {
    return this.collectionApi.getCollectionComboByIdArgs(
      this.collection(),
      this.collectionId(),
    );
  });
  public comboDataResource$ = toObservable(
    this.comboDataResource.asReadonly().value,
  ).pipe(filter((data) => !!data));

  public serviceInstanceDetails: ServiceInstanceDetailsResponseDto | null =
    null;

  // Permissions
  hasAdmin = signal(false);
  hasDelete = signal(false);
  hasSudo = signal(false);
  hasUpdate = signal(false);
  hasApprove = signal(false);

  refresh = signal(0);

  connectedTableCollection = signal<CollectionNames>('project');
  connectedTableCollectionOptions = computed(() => {
    const collectionOptions = this.config()?.connectedTable;
    if (collectionOptions && collectionOptions[0]) {
      return collectionOptions.map((c) => c.collection);
    } else {
      return [];
    }
  });

  private ngUnsubscribe = new Subject<any>();

  constructor() {
    effect(() => {
      const collectionOptions = this.config()?.connectedTable;
      if (collectionOptions && collectionOptions[0]) {
        this.connectedTableCollection.set(collectionOptions[0].collection);
      } else {
        this.connectedTableCollection.set('project');
      }
    });
  }

  ngOnInit(): void {
    this.graphApi
      .createEventSource()
      .pipe(takeUntil(this.ngUnsubscribe), startWith(null))
      .subscribe((es: any) => {
        if (es !== null && this.comboData()?.collection) {
          if (es.event === 'edge-add') {
            if (
              es.edge.source === this.comboData()?.collection.vertex ||
              es.edge.target === this.comboData()?.collection.vertex
            ) {
              this.updateCollection();
              this.openSnackBar('The object was updated.');
            }
          }
          if (es.event === 'vertex-edit') {
            if (es.vertex.id === this.comboData()?.collection.vertex) {
              this.updateCollection();
              this.openSnackBar('The object was updated.');
            }
          } else if (es.event === 'collection-edit') {
            if (es.collection.vertex === this.comboData()?.collection.vertex) {
              this.updateCollection();
              this.openSnackBar('The object was updated.');
            }
          } else if (
            es.event === 'vertex-delete' ||
            es.event === 'edge-delete'
          ) {
            if (es.vertex.indexOf(this.comboData()?.collection.vertex) !== -1) {
              this.openSnackBar('The object was deleted.');
              this.back();
            } else if (
              es.adjacentVertex.indexOf(this.comboData()?.collection.vertex) !== -1
            ) {
              this.updateCollection();
              this.openSnackBar('The object was updated.');
            }
          }
        }
      });

    combineLatest([
      this.graphApi.getUserPermissions(),
      this.comboDataResource$,
    ]).subscribe(([permissions, comboData]) => {
      if (!this.config()) {
        return;
      }

      this.comboData.set(comboData as CollectionCombo<any>);
      this.hasAdmin.set(this.permission.hasAdmin());
      this.hasSudo.set(this.permission.hasSudo(
        permissions,
        this.comboData()?.collection.vertex,
      ));
      this.hasUpdate.set(this.permission.hasUpdate(
        permissions,
        this.comboData()?.collection.vertex,
      ));
      this.hasDelete.set(this.permission.hasDelete(
        permissions,
        this.comboData()?.collection.vertex,
      ));
      this.hasApprove.set(this.permission.hasApprove(
        permissions,
        this.comboData()?.collection.vertex,
      ));

      this.serviceInstanceDetails = null;

      if (this.collection() === 'serviceInstance') {
        this.collectionApi
          .getServiceInstanceDetails(this.comboData()?.collection.id)
          .subscribe((data) => {
            this.serviceInstanceDetails = data;
          });
      }
      this.hideLoading.set(false);
      this.refresh.set(this.refresh() + 1);
    });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next(true);
    this.ngUnsubscribe.complete();
  }

  isUpstreamConnectedCollection(collection: CollectionNames) {
    return (
      this.config()?.connectedTable?.find(
        (c) => c.collection === collection && c.direction === 'upstream',
      ) !== undefined
    );
  }

  updateCollection() {
    this.hideLoading.set(true);
    this.comboDataResource.reload();
  }

  navigate(target: EdgeDto | VertexDto) {
    if ('collection' in target) {
      this.collectionApi
        .searchCollection(target.collection, {
          vertexId: target.id,
          offset: 0,
          limit: 1,
        })
        .subscribe((result) => {
          if (result && result.meta.total > 0) {
            this.router.navigate([
              '/browse',
              target.collection,
              result.data[0].collection.id,
            ]);
          }
        });
    } else {
      this.graphUtil.openInGraph(target.id, 'edge', false);
    }
  }

  back() {
    this.router.navigate(['..'], { relativeTo: this.activatedRoute });
  }

  selectedTabChange(event: MatTabChangeEvent) {
    this.updateRoute(event.index);
  }

  updateRoute(selectedTabIndex: number) {
    this.router.navigate([
      `/browse/${this.collection()}/${this.collectionId()}`,
      { index: selectedTabIndex },
    ]);
  }

  openInGraph() {
    const vertex = this.comboData()?.vertex;
    if (vertex) {
      this.graphUtil.openInGraph(vertex.id, 'vertex', false);
    }
  }

  openAccessToken() {
    this.collectionUtil.openAccessToken(this.comboData()?.collection.id);
  }

  openServiceBuilds() {
    this.collectionUtil.openServiceBuilds(this.comboData()?.collection.id);
  }

  openServiceInstances() {
    this.collectionUtil.openServiceInstances(this.comboData()?.collection.id);
  }

  openServiceHistory() {
    this.collectionUtil.openServiceHistory(this.comboData()?.collection.id);
  }

  openBrokerAccountHistory() {
    this.collectionUtil.openBrokerAccountHistory(this.comboData()?.collection.id);
  }

  edit() {
    this.dialog
      .open(VertexDialogComponent, {
        width: '500px',
        data: {
          collection: this.collection(),
          vertex: this.comboData()?.vertex,
          data: this.comboData()?.collection,
        },
      })
      .afterClosed()
      .subscribe();
  }

  editTags() {
    this.dialog
      .open(TagDialogComponent, {
        width: '500px',
        data: {
          collection: this.collection(),
          collectionData: this.comboData()?.collection,
        },
      })
      .afterClosed()
      .subscribe();
  }

  delete() {
    this.dialog
      .open(DeleteConfirmDialogComponent, {
        width: '500px',
      })
      .afterClosed()
      .subscribe((result) => {
        if (result && result.confirm) {
          this.graphApi
            .deleteVertex(this.comboData()?.collection.vertex)
            .subscribe();
        }
      });
  }

  openMemberDialog() {
    if (!this.comboData()) {
      return;
    }
    this.dialog
      .open(MemberDialogComponent, {
        width: '600px',
        data: {
          vertex: this.comboData()?.vertex.id,
          name: this.comboData()?.collection.name,
        },
      })
      .afterClosed()
      .subscribe();
  }

  showGitHubRoleMappings() {
    this.dialog
      .open(GithubRoleMappingDialogComponent, {
        width: '600px',
        data: {},
      })
      .afterClosed()
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      .subscribe(() => {});
  }

  private openSnackBar(message: string) {
    const config = new MatSnackBarConfig();
    config.duration = 5000;
    config.verticalPosition = 'bottom';
    this.snackBar.open(message, 'Dismiss', config);
  }
}
