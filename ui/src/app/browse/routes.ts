import { inject } from '@angular/core';
import { Route } from '@angular/router';
import { CollectionInspectorComponent } from './collection-inspector/collection-inspector.component';
import { PreferencesService } from '../preferences.service';
import { ServiceBuildDetailsComponent } from './service-build-details/service-build-details.component';
import { CollectionBrowserComponent } from './collection-browser/collection-browser.component';
import { StringUtilService } from '../util/string-util.service';
import { BrokerAccountTokenDetailsComponent } from './broker-account-token-details/broker-account-token-details.component';
import { CollectionConnectionComponent } from './collection-connection/collection-connection.component';
import { ServiceBuildsComponent } from './service-builds/service-builds.component';
import { ServiceInstancesComponent } from './service-instances/service-instances.component';
import { CollectionHistoryComponent } from './collection-history/collection-history.component';

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
    path: ':collection/:collectionId',
    component: CollectionInspectorComponent,
    title: 'Inspector',
  },
  {
    path: ':collection/:collectionId/connections',
    component: CollectionConnectionComponent,
    title: 'Connections',
  },
  {
    path: 'brokerAccount/:id/token',
    component: BrokerAccountTokenDetailsComponent,
    title: 'Broker Account Token',
  },
  {
    path: 'brokerAccount/:collectionId/history',
    component: CollectionHistoryComponent,
    title: 'History',
    data: { collection: 'brokerAccount' },
  },
  {
    path: 'service/:id/build',
    component: ServiceBuildsComponent,
    title: 'Build',
  },
  {
    path: 'service/:id/build/:buildId',
    component: ServiceBuildDetailsComponent,
    title: 'Build',
  },
  {
    path: 'service/:id/instances',
    component: ServiceInstancesComponent,
    title: 'Instances',
  },
  {
    path: 'service/:collectionId/history',
    component: CollectionHistoryComponent,
    title: 'History',
    data: { collection: 'service' },
  },
];
