import { Route } from '@angular/router';
import { HistoryComponent } from './history/history.component';
import { IntentionPanelComponent } from './intention-panel/intention-panel.component';

export const INTENTION_ROUTES: Route[] = [
  { path: 'history', component: HistoryComponent, title: 'History' },
  {
    path: ':id',
    component: IntentionPanelComponent,
    title: 'Intention Details',
  },
];
