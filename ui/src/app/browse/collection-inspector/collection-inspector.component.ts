import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import {
  MatSnackBar,
  MatSnackBarConfig,
  MatSnackBarModule,
} from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  Subject,
  Subscription,
  combineLatest,
  startWith,
  switchMap,
  takeUntil,
} from 'rxjs';

import { GraphApiService } from '../../service/graph-api.service';
import { CollectionApiService } from '../../service/collection-api.service';
import { GraphUtilService } from '../../service/graph-util.service';
import { PermissionService } from '../../service/permission.service';
import { CURRENT_USER } from '../../app-initialize.factory';
import { UserDto } from '../../service/graph.types';

import { CollectionNames } from '../../service/dto/collection-dto-union.type';
import { CollectionConfigRestDto } from '../../service/dto/collection-config-rest.dto';
import { CollectionHeaderComponent } from '../../shared/collection-header/collection-header.component';
import { InspectorAccountComponent } from '../../graph/inspector-account/inspector-account.component';
import { InspectorInstallsComponent } from '../../graph/inspector-installs/inspector-installs.component';
import { InspectorInstancesComponent } from '../../graph/inspector-instances/inspector-instances.component';
import { InspectorIntentionsComponent } from '../../graph/inspector-intentions/inspector-intentions.component';
import { InspectorServiceSecureComponent } from '../../graph/inspector-service-secure/inspector-service-secure.component';
import { InspectorTeamComponent } from '../../graph/inspector-team/inspector-team.component';
import { InspectorVaultComponent } from '../../graph/inspector-vault/inspector-vault.component';
import { InspectorVertexFieldsComponent } from '../../graph/inspector-vertex-fields/inspector-vertex-fields.component';
import { VertexTagsComponent } from '../../graph/vertex-tags/vertex-tags.component';
import { InspectorServiceReleasesComponent } from '../../graph/inspector-service-releases/inspector-service-releases.component';

@Component({
  selector: 'app-collection-inspector',
  standalone: true,
  imports: [
    CommonModule,
    InspectorAccountComponent,
    InspectorInstallsComponent,
    InspectorInstancesComponent,
    InspectorIntentionsComponent,
    InspectorServiceSecureComponent,
    InspectorServiceReleasesComponent,
    InspectorTeamComponent,
    InspectorVaultComponent,
    InspectorVertexFieldsComponent,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatGridListModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    CollectionHeaderComponent,
    VertexTagsComponent,
  ],
  templateUrl: './collection-inspector.component.html',
  styleUrl: './collection-inspector.component.scss',
})
export class CollectionInspectorComponent implements OnInit, OnDestroy {
  loading = true;
  collection: CollectionNames = 'project';
  collectionId!: string;
  config!: CollectionConfigRestDto;
  collectionData: any;
  outboundConnections = null;
  routeSub: Subscription | null = null;
  serviceDetails: any = null;
  hasDelete = false;
  hasSudo = false;
  hasUpdate = false;
  hasApprove = false;

  private triggerRefresh = new BehaviorSubject(true);

  private ngUnsubscribe: Subject<any> = new Subject();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly snackBar: MatSnackBar,
    private readonly graphApi: GraphApiService,
    private readonly collectionApi: CollectionApiService,
    private readonly permission: PermissionService,
    public readonly graphUtil: GraphUtilService,
    @Inject(CURRENT_USER) public readonly user: UserDto,
  ) {}

  ngOnInit(): void {
    if (!this.routeSub) {
      this.routeSub = this.route.params.subscribe(() => {
        this.initComponent();
      });
    }
  }

  initComponent() {
    this.collection = this.route.snapshot.params['collection'];
    this.collectionId = this.route.snapshot.params['id'];

    this.graphApi
      .createEventSource()
      .pipe(takeUntil(this.ngUnsubscribe), startWith(null))
      .subscribe((es: any) => {
        if (es !== null && this.collectionData) {
          if (es.event === 'vertex-edit') {
            if (es.vertex.id === this.collectionData.vertex) {
              this.updateCollection();
              this.openSnackBar(`The object was updated.`);
            }
          } else if (es.event === 'collection-edit') {
            if (es.collection.vertex === this.collectionData.vertex) {
              this.updateCollection();
              this.openSnackBar(`The object was updated.`);
            }
          } else if (es.event === 'vertex-delete') {
            if (es.vertex.indexOf(this.collectionData.vertex) !== -1) {
              this.openSnackBar(`The object was deleted.`);
              this.back();
            }
          }
        }
      });
    combineLatest([
      this.graphApi.getCollectionConfig(this.collection),
      this.graphApi.getUserPermissions(),
      this.triggerRefresh.pipe(
        takeUntil(this.ngUnsubscribe),
        switchMap(() => {
          return this.collectionApi.getCollectionById(
            this.collection,
            this.collectionId,
          );
        }),
      ),
    ]).subscribe(([config, permissions, collection]) => {
      if (!config) {
        return;
      }
      this.config = config;
      this.collectionData = collection;
      this.loading = false;
      this.hasSudo = this.permission.hasSudo(
        permissions,
        this.collectionData.vertex,
      );
      this.hasUpdate = this.permission.hasUpdate(
        permissions,
        this.collectionData.vertex,
      );
      this.hasDelete = this.permission.hasDelete(
        permissions,
        this.collectionData.vertex,
      );
      this.hasApprove = this.permission.hasApprove(
        permissions,
        this.collectionData.vertex,
      );

      if (this.collection === 'service') {
        this.collectionApi
          .getServiceDetails(this.collectionData.id)
          .subscribe((data: any) => {
            this.serviceDetails = data;
          });
      }
    });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next(true);
    this.ngUnsubscribe.complete();

    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }

  updateCollection() {
    this.triggerRefresh.next(true);
  }

  back() {
    this.router.navigate(['..'], { relativeTo: this.activatedRoute });
  }

  private openSnackBar(message: string) {
    const config = new MatSnackBarConfig();
    config.duration = 5000;
    config.verticalPosition = 'bottom';
    this.snackBar.open(message, 'Dismiss', config);
  }
}
