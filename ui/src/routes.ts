import { Route } from '@angular/router';
import { PageNotFoundComponent } from './app/page-not-found/page-not-found.component';

export const ROUTES: Route[] = [
  {
    path: 'home',
    loadChildren: () =>
      import('./app/home/routes').then((mod) => mod.HOME_ROUTES),
  },
  {
    path: 'graph',
    loadChildren: () =>
      import('./app/graph/routes').then((mod) => mod.GRAPH_ROUTES),
  },
  {
    path: 'intention',
    loadChildren: () =>
      import('./app/intention/routes').then((mod) => mod.INTENTION_ROUTES),
  },
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: '**', component: PageNotFoundComponent },
];
