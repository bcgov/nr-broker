import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';

import { CollectionHeaderComponent } from '../../shared/collection-header/collection-header.component';
import { PackageApiService } from '../../service/package-api.service';
import { PackageBuildRestDto } from '../../service/dto/package-build-rest.dto';
import { FilesizePipe } from '../../util/filesize.pipe';

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
  @Input() serviceId!: string;
  @Input() buildId!: string;
  @Input() isApprover!: boolean;
  @Input() screenSize!: string;

  loading = true;
  data: PackageBuildRestDto | undefined;

  constructor(private readonly packageApi: PackageApiService) {}

  ngOnInit(): void {
    this.packageApi.getBuild(this.buildId).subscribe((data) => {
      this.data = data;
      this.loading = false;
    });
  }
}
