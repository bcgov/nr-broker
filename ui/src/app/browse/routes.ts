import { inject } from '@angular/core';
import { Route } from '@angular/router';
// import { CollectionTableComponent } from './collection-table/collection-table.component';
import { CollectionInspectorComponent } from './collection-inspector/collection-inspector.component';
import { PreferencesService } from '../preferences.service';
import { ServiceBuildDetailsComponent } from './service-build-details/service-build-details.component';
import { CollectionBrowserComponent } from './collection-browser/collection-browser.component';
import { StringUtilService } from '../util/string-util.service';

export const BROWSE_ROUTES: Route[] = [
  {
    path: '',
    redirectTo: () => {
      const preferences = inject(PreferencesService);
      const stringUtil = inject(StringUtilService);
      return stringUtil.toCollectionName(
        preferences.get('browseCollectionDefault'),
      );
    },
    pathMatch: 'full',
  },
  {
    path: ':collection',
    component: CollectionBrowserComponent,
    title: 'Browse',
  },
  {
    path: ':collection/:id',
    component: CollectionInspectorComponent,
    title: 'Inspector',
  },
  {
    path: ':collection/:id/build/:buildId',
    component: ServiceBuildDetailsComponent,
    title: 'Build',
  },
];
