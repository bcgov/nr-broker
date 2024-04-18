import { Route } from '@angular/router';
import { CollectionTableComponent } from './collection-table/collection-table.component';

export const BROWSE_ROUTES: Route[] = [
  { path: '', redirectTo: 'project', pathMatch: 'full' },
  { path: ':collection', component: CollectionTableComponent, title: 'Browse' },
];
