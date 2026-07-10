import { Route } from '@angular/router';
import { HomeComponent } from './home.component';
import { ExternalServiceComponent } from './external-service/external-service.component';
import { postloginGuard } from '../postlogin.guard';

export const HOME_ROUTES: Route[] = [
  {
    path: '',
    component: HomeComponent,
    title: 'Home',
    canActivate: [postloginGuard],
  },
  {
    path: 'external-service/:id',
    component: ExternalServiceComponent,
    title: 'External Service',
    canActivate: [postloginGuard],
    data: {
      backCommands: ['/home'],
    },
  },
];
