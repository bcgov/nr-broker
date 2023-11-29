import { Route } from '@angular/router';
import { TeamComponent } from './team.component';
import { TeamViewerComponent } from './team-viewer/team-viewer.component';

export const TEAM_ROUTES: Route[] = [
  { path: '', component: TeamComponent, title: 'Teams' },
  { path: ':id', component: TeamViewerComponent, title: 'Teams' },
];
