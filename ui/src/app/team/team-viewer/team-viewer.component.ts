import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { switchMap } from 'rxjs';
import { CURRENT_USER } from '../../app-initialize.factory';
import { GraphApiService } from '../../service/graph-api.service';
import { UserDto } from '../../service/graph.types';

@Component({
  selector: 'app-team-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './team-viewer.component.html',
  styleUrl: './team-viewer.component.scss',
})
export class TeamViewerComponent {
  team$: any;
  service: any;
  constructor(
    private route: ActivatedRoute,
    private readonly graphApi: GraphApiService,
    @Inject(CURRENT_USER) public readonly user: UserDto,
  ) {}

  ngOnInit() {
    this.team$ = this.route.paramMap.pipe(
      switchMap((params: ParamMap) =>
        this.graphApi.getCollectionData('team', params.get('id') as string),
      ),
    );
  }
}
