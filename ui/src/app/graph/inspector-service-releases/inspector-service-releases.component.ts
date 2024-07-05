import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { PackageApiService } from '../../service/package-api.service';
import { PackageBuildRestDto } from '../../service/dto/package-build-rest.dto';
import { CollectionSearchResult } from '../../service/dto/collection-search-result.dto';

@Component({
  selector: 'app-inspector-service-releases',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDividerModule, MatTableModule],
  templateUrl: './inspector-service-releases.component.html',
  styleUrl: './inspector-service-releases.component.scss',
})
export class InspectorServiceReleasesComponent {
  @Input() builds!: CollectionSearchResult<PackageBuildRestDto>;
  @Input() isApprover!: boolean;

  public disableApprove: {
    [key: string]: boolean;
  } = {};

  propDisplayedColumns: string[] = ['version', 'date', 'name', 'approval'];

  constructor(private readonly packageApi: PackageApiService) {}

  approvePackageBuild(build: PackageBuildRestDto) {
    this.disableApprove[build.id] = true;
    this.packageApi.approveBuild(build.id).subscribe(() => {});
  }
}
