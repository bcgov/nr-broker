import { Route } from '@angular/router';
import { CollectionTableComponent } from './collection-table/collection-table.component';
import { CollectionInspectorComponent } from './collection-inspector/collection-inspector.component';

export const BROWSE_ROUTES: Route[] = [
  { path: '', redirectTo: 'project', pathMatch: 'full' },
  { path: ':collection', component: CollectionTableComponent, title: 'Browse' },
  {
    path: ':collection/:id',
    component: CollectionInspectorComponent,
    title: 'Inspector',
  },
];
