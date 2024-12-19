import {
  enableProdMode,
  importProvidersFrom,
  inject,
  provideAppInitializer,
} from '@angular/core';

import { environment } from './environments/environment';
import { AppComponent } from './app/app.component';
import { ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from './app/app-routing.module';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AuthInterceptor } from './app/auth.interceptor';
import {
  HttpClient,
  HTTP_INTERCEPTORS,
  withInterceptorsFromDi,
  provideHttpClient,
} from '@angular/common/http';
import {
  appInitializeConfigFactory,
  appInitializePrefFactory,
  appInitializeUserFactory,
} from './app/app-initialize.factory';
import { MatDialogModule } from '@angular/material/dialog';
import { RouterModule, TitleStrategy } from '@angular/router';
import { ROUTES } from './routes';
import { RouteTitleStrategy } from './route-title.strategy';
import { provideNativeDateAdapter } from '@angular/material/core';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      BrowserModule,
      AppRoutingModule,
      MatDialogModule,
      ReactiveFormsModule,
      RouterModule.forRoot(ROUTES),
    ),
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
    provideHttpClient(withInterceptorsFromDi()),
    provideNativeDateAdapter(),
  ],
}).catch((err) => console.error(err));
