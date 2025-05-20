import { Component, input } from '@angular/core';
import { CollectionConfigInstanceDto } from '../../service/persistence/dto/collection-config.dto';
import { GraphApiService } from '../../service/graph-api.service';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { TeamServiceRequestComponent } from '../../team/team-service-request/team-service-request.component';

@Component({
  selector: 'app-team-services',
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    TeamServiceRequestComponent,
  ],
  templateUrl: './team-services.component.html',
  styleUrl: './team-services.component.scss',
})
export class TeamServicesComponent {
  readonly teamVertex = input.required<string>();

  propDisplayedColumns: string[] = ['key', 'value'];

  activeServices: CollectionConfigInstanceDto[] = [];
  requestServices: CollectionConfigInstanceDto[] = [];
  serviceCount = 0;

  constructor(private readonly graphApi: GraphApiService) {}

  ngOnInit() {
    this.graphApi
      .getEdgeConfigByVertex(this.teamVertex(), 'service', 'uses')
      .subscribe((search) => {
        this.activeServices = search.filter((cci) => cci.instance);
        this.requestServices = search.filter((cci) => !cci.instance);
      });
  }
}
