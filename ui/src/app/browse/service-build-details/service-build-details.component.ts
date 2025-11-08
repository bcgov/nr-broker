import { CommonModule, } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { combineLatest } from 'rxjs';

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
import { ScreenService } from '../../util/screen.service';

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
export class ServiceBuildDetailsComponent {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly collectionApi = inject(CollectionApiService);
  private readonly packageApi = inject(PackageApiService);
  private readonly packageUtil = inject(PackageUtilService);
  private readonly collectionUtil = inject(CollectionUtilService);
  readonly screen = inject(ScreenService);

  collection = signal<CollectionNames>('service');
  serviceId = signal<string>('');
  buildId = signal<string>('');

  vertex = signal('');
  name = signal('');
  hasDelete = signal(false);

  loading = signal(true);
  data: PackageBuildDto | undefined;

  constructor() {
    this.activatedRoute.params.subscribe((params) => {
      this.serviceId.set(params['id']);
      this.buildId.set(params['buildId']);

      combineLatest([
        this.collectionApi.getCollectionById('service', this.serviceId()),
        this.packageApi.getBuild(this.buildId()),
      ]).subscribe(([service, data]) => {
        this.name.set(service.name);
        this.vertex.set(service.vertex);
        this.data = data;
        this.loading.set(false);
        // console.log('Service build details', data);
      });
    });
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
        this.name(),
        this.data?.package.name ?? '',
        this.data?.package.version ?? '',
      )
      .subscribe((build) => {
        if (build) {
          this.collectionUtil.openServicePackage(this.serviceId(), build.id);
        } else {
          //this.packageUtil.openSnackBar('No build found');
        }
      });
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  delete() {}
}
