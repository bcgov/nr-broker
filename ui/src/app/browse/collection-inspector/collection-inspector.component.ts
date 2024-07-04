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
  Subject,
  Subscription,
  combineLatest,
  startWith,
  takeUntil,
} from 'rxjs';

import { GraphApiService } from '../../service/graph-api.service';
import { CollectionApiService } from '../../service/collection-api.service';
import { CURRENT_USER } from '../../app-initialize.factory';
import { UserDto } from '../../service/graph.types';
import { GraphUtilService } from '../../service/graph-util.service';
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
import { PermissionService } from '../../service/permission.service';

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

  private ngUnsubscribe: Subject<any> = new Subject();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly graphApi: GraphApiService,
    private readonly snackBar: MatSnackBar,
    private readonly collectionApi: CollectionApiService,
    private readonly permission: PermissionService,
    @Inject(CURRENT_USER) public readonly user: UserDto,
    public graphUtil: GraphUtilService,
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

    combineLatest([
      this.graphApi.getCollectionConfig(this.collection),
      this.collectionApi.getCollectionById(this.collection, this.collectionId),
      this.graphApi
        .createEventSource()
        .pipe(takeUntil(this.ngUnsubscribe), startWith(null)),
      this.graphApi.getUserPermissions(),
    ]).subscribe(([config, collection, es, permissions]) => {
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
      if (es !== null) {
        if (es.event === 'vertex-edit') {
          if (es.vertex.id === collection.vertex) {
            this.updateCollection();
          }
        } else if (es.event === 'collection-edit') {
          if (es.collection.vertex === collection.vertex) {
            this.updateCollection();
          }
        } else if (es.event === 'vertex-delete') {
          if (es.vertex.indexOf(collection.vertex) !== -1) {
            this.openSnackBar(`The item was deleted.`);
            this.back();
          }
        }
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
    this.collectionApi
      .getCollectionById(this.collection, this.collectionId)
      .subscribe((collection) => {
        this.collectionData = collection;
      });
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
