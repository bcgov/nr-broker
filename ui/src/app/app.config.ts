import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
} from '@angular/core';
import {
  provideRouter,
  TitleStrategy,
  withComponentInputBinding,
} from '@angular/router';
import {
  HttpClient,
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
  withFetch,
} from '@angular/common/http';
import { provideNativeDateAdapter } from '@angular/material/core';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { RouteTitleStrategy } from './route-title.strategy';
import {
  appInitializePrefFactory,
  appInitializeUserFactory,
  appInitializeConfigFactory,
} from './app-initialize.factory';
import { AuthInterceptor } from './auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideAppInitializer(() => {
      const http = inject(HttpClient);
      return appInitializePrefFactory(http);
    }),
    provideAppInitializer(() => {
      const http = inject(HttpClient);
      return appInitializeUserFactory(http);
    }),
    provideAppInitializer(() => {
      const http = inject(HttpClient);
      return appInitializeConfigFactory(http);
    }),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    {
      provide: TitleStrategy,
      useClass: RouteTitleStrategy,
    },
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi(), withFetch()),
    provideNativeDateAdapter(),
  ],
};
