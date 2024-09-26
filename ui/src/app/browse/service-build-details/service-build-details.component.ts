import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatTooltipModule } from '@angular/material/tooltip';
import { combineLatest, Subject, takeUntil } from 'rxjs';

import { CollectionHeaderComponent } from '../../shared/collection-header/collection-header.component';
import { PackageApiService } from '../../service/package-api.service';
import { PackageBuildRestDto } from '../../service/dto/package-build-rest.dto';
import { FilesizePipe } from '../../util/filesize.pipe';
import { CollectionNames } from '../../service/dto/collection-dto-union.type';
import { CollectionApiService } from '../../service/collection-api.service';
import { PackageUtilService } from '../../service/package-util.service';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-service-build-details',
  standalone: true,
  imports: [
    CommonModule,
    ClipboardModule,
    CollectionHeaderComponent,
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
  collection!: CollectionNames;
  serviceId!: string;
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
  data: PackageBuildRestDto | undefined;

  private ngUnsubscribe: Subject<any> = new Subject();

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly collectionApi: CollectionApiService,
    private readonly packageApi: PackageApiService,
    private readonly packageUtil: PackageUtilService,
  ) {
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
    const params = this.activatedRoute.snapshot.params;
    this.serviceId = params['id'];
    this.buildId = params['buildId'];
    this.collection = params['collection'];

    combineLatest([
      this.collectionApi.getCollectionById('service', this.serviceId),
      this.packageApi.getBuild(this.buildId),
    ]).subscribe(([service, data]) => {
      this.name = service.name;
      this.data = data;
      this.loading = false;
    });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.complete();
  }

  async openPackageBuildVersion(id: string, version: string) {
    return this.packageUtil.openPackageBuildVersion(id, version);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  delete() {}
}
