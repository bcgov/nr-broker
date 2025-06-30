import { Routes } from '@angular/router';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { PageErrorComponent } from './page-error/page-error.component';

export const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/routes').then((mod) => mod.HOME_ROUTES),
  },
  {
    path: 'browse',
    loadChildren: () =>
      import('./browse/routes').then((mod) => mod.BROWSE_ROUTES),
  },
  {
    path: 'graph',
    loadChildren: () =>
      import('./graph/routes').then((mod) => mod.GRAPH_ROUTES),
  },
  {
    path: 'intention',
    loadChildren: () =>
      import('./intention/routes').then((mod) => mod.INTENTION_ROUTES),
  },
  {
    path: 'error',
    component: PageErrorComponent,
  },
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: '**', component: PageNotFoundComponent },
];
