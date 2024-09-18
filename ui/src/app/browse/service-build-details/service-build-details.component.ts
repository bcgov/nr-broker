import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { combineLatest } from 'rxjs';

import { CollectionHeaderComponent } from '../../shared/collection-header/collection-header.component';
import { PackageApiService } from '../../service/package-api.service';
import { PackageBuildRestDto } from '../../service/dto/package-build-rest.dto';
import { FilesizePipe } from '../../util/filesize.pipe';
import { CollectionNames } from '../../service/dto/collection-dto-union.type';
import { CollectionApiService } from '../../service/collection-api.service';

@Component({
  selector: 'app-service-build-details',
  standalone: true,
  imports: [
    CommonModule,
    CollectionHeaderComponent,
    FilesizePipe,
    MatCardModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './service-build-details.component.html',
  styleUrl: './service-build-details.component.scss',
})
export class ServiceBuildDetailsComponent implements OnInit {
  collection!: CollectionNames;
  serviceId!: string;
  buildId!: string;
  name!: string;
  isApprover!: boolean;
  // screenSize!: string;

  loading = true;
  data: PackageBuildRestDto | undefined;

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly collectionApi: CollectionApiService,
    private readonly packageApi: PackageApiService,
  ) {}

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
}
