import { inject } from '@angular/core';
import { Route } from '@angular/router';
import { CollectionTableComponent } from './collection-table/collection-table.component';
import { CollectionInspectorComponent } from './collection-inspector/collection-inspector.component';
import { PreferencesService } from '../preferences.service';

export const BROWSE_ROUTES: Route[] = [
  {
    path: '',
    redirectTo: () => {
      const preferences = inject(PreferencesService);
      return preferences.get('browseCollectionDefault');
    },
    pathMatch: 'full',
  },
  { path: ':collection', component: CollectionTableComponent, title: 'Browse' },
  {
    path: ':collection/:id',
    component: CollectionInspectorComponent,
    title: 'Inspector',
  },
];
