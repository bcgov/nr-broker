import {
  enableProdMode,
  APP_INITIALIZER,
  importProvidersFrom,
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
  appInitializePrefFactory,
  appInitializeUserFactory,
} from './app/app-initialize.factory';
import { MatDialogModule } from '@angular/material/dialog';
import { RouterModule, TitleStrategy } from '@angular/router';
import { ROUTES } from './routes';
import { RouteTitleStrategy } from './route-title.strategy';

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
    {
      provide: APP_INITIALIZER,
      useFactory: appInitializePrefFactory,
      deps: [HttpClient],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: appInitializeUserFactory,
      deps: [HttpClient],
      multi: true,
    },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    {
      provide: TitleStrategy,
      useClass: RouteTitleStrategy,
    },
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),
  ],
}).catch((err) => console.error(err));
