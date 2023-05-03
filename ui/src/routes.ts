import { Route } from '@angular/router';
import { PageNotFoundComponent } from './app/page-not-found/page-not-found.component';

export const ROUTES: Route[] = [
  {
    path: 'graph',
    loadChildren: () =>
      import('./app/graph/routes').then((mod) => mod.GRAPH_ROUTES),
  },
  { path: '', redirectTo: '/graph', pathMatch: 'full' },
  { path: '**', component: PageNotFoundComponent },
];
