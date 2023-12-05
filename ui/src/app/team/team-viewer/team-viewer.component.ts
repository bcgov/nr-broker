import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ActivatedRoute, ParamMap, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { Observable, switchMap } from 'rxjs';
import { CURRENT_USER } from '../../app-initialize.factory';
import { UserDto } from '../../service/graph.types';
import { CollectionApiService } from '../../service/collection-api.service';
import { TeamRestDto } from '../../service/dto/team-rest.dto';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-team-viewer',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    RouterModule,
  ],
  templateUrl: './team-viewer.component.html',
  styleUrl: './team-viewer.component.scss',
})
export class TeamViewerComponent {
  team$!: Observable<TeamRestDto>;
  service: any;
  constructor(
    private route: ActivatedRoute,
    private readonly collectionApi: CollectionApiService,
    @Inject(CURRENT_USER) public readonly user: UserDto,
  ) {}

  ngOnInit() {
    this.team$ = this.route.paramMap.pipe(
      switchMap((params: ParamMap) =>
        this.collectionApi.getCollectionById(
          'team',
          params.get('id') as string,
        ),
      ),
    );
  }
}
