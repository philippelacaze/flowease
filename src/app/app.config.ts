import {
  ApplicationConfig,
  APP_INITIALIZER,
  LOCALE_ID,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  inject,
} from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
registerLocaleData(localeFr);
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';
import { StorageService } from './core/services/storage.service';
import { ThemeService } from './core/services/theme.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    provideAnimationsAsync(),
    provideHttpClient(),

    // Initialisation IndexedDB avant premier rendu
    {
      provide: APP_INITIALIZER,
      useFactory: (db: StorageService) => () => db.init(),
      deps: [StorageService],
      multi: true,
    },

    // Applique le thème sauvegardé dès le démarrage (synchrone via localStorage)
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const theme = inject(ThemeService);
        return () => theme.apply();
      },
      multi: true,
    },

    // Service Worker — actif uniquement en production
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
