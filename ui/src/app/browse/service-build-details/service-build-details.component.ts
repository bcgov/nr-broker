import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatMenuModule } from '@angular/material/menu';
import { combineLatest, Subject, takeUntil } from 'rxjs';

import { CollectionHeaderComponent } from '../../shared/collection-header/collection-header.component';
import { PackageApiService } from '../../service/package-api.service';
import { PackageBuildDto } from '../../service/persistence/dto/package-build.dto';
import { FilesizePipe } from '../../util/filesize.pipe';
import { CollectionNames } from '../../service/persistence/dto/collection-dto-union.type';
import { CollectionApiService } from '../../service/collection-api.service';
import { PackageUtilService } from '../../service/package-util.service';
import { InspectorInstallsComponent } from '../../graph/inspector-installs/inspector-installs.component';
import { CollectionUtilService } from '../../service/collection-util.service';
import { DetailsItemComponent } from '../../shared/details-item/details-item.component';

@Component({
  selector: 'app-service-build-details',
  imports: [
    CommonModule,
    ClipboardModule,
    CollectionHeaderComponent,
    InspectorInstallsComponent,
    DetailsItemComponent,
    FilesizePipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './service-build-details.component.html',
  styleUrl: './service-build-details.component.scss',
})
export class ServiceBuildDetailsComponent implements OnInit, OnDestroy {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly collectionApi = inject(CollectionApiService);
  private readonly packageApi = inject(PackageApiService);
  private readonly packageUtil = inject(PackageUtilService);
  private readonly collectionUtil = inject(CollectionUtilService);

  collection!: CollectionNames;
  serviceId!: string;
  vertex!: string;
  buildId!: string;
  name!: string;
  isApprover!: boolean;
  hasDelete = false;
  screenSize = 'wide';

  // Create a map from breakpoints to css class
  displayNameMap = new Map([
    [Breakpoints.XSmall, 'narrow'],
    [Breakpoints.Small, 'narrow'],
    [Breakpoints.Medium, 'wide'],
    [Breakpoints.Large, 'wide'],
    [Breakpoints.XLarge, 'wide'],
  ]);

  loading = true;
  data: PackageBuildDto | undefined;

  private ngUnsubscribe = new Subject<any>();

  constructor() {
    inject(BreakpointObserver)
      .observe([
        Breakpoints.XSmall,
        Breakpoints.Small,
        Breakpoints.Medium,
        Breakpoints.Large,
        Breakpoints.XLarge,
      ])
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((result) => {
        for (const query of Object.keys(result.breakpoints)) {
          if (result.breakpoints[query]) {
            this.screenSize = this.displayNameMap.get(query) ?? 'Unknown';
          }
        }
      });
  }

  ngOnInit(): void {
    this.activatedRoute.params.subscribe((params) => {
      this.serviceId = params['id'];
      this.buildId = params['buildId'];
      this.collection = params['collection'];

      combineLatest([
        this.collectionApi.getCollectionById('service', this.serviceId),
        this.packageApi.getBuild(this.buildId),
      ]).subscribe(([service, data]) => {
        this.name = service.name;
        this.vertex = service.vertex;
        this.data = data;
        this.loading = false;
        // console.log('Service build details', data);
      });
    });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.complete();
  }

  async openPackageBuildVersion(vertexId: string, version: string) {
    return this.packageUtil.openPackageBuildVersion(vertexId, version);
  }

  openHistoryById(id: string) {
    this.packageUtil.openHistoryById(id);
  }

  openLatestPackageBuild() {
    this.packageApi
      .getServiceBuildByVersion(
        this.name,
        this.data?.package.name ?? '',
        this.data?.package.version ?? '',
      )
      .subscribe((build) => {
        if (build) {
          this.collectionUtil.openServicePackage(this.serviceId, build.id);
        } else {
          //this.packageUtil.openSnackBar('No build found');
        }
      });
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  delete() {}
}
