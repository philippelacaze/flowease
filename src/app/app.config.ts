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
import {
  STORAGE_PORT,
  LOCAL_SETTINGS_PORT,
  MEAL_ANALYSIS_PORT,
  NOTE_TAGGING_PORT,
  ANALYSIS_PORT,
  REPORT_PORT,
  COACH_PORT,
  API_KEY_TEST_PORT,
  NOTIFICATION_PORT,
} from './application/tokens';
import { IndexedDBAdapter } from './infrastructure/storage/indexeddb.adapter';
import { LocalSettingsAdapter } from './infrastructure/storage/local-settings.adapter';
import { AnthropicAdapter } from './infrastructure/ai/anthropic/anthropic.adapter';
import { NotificationService } from './infrastructure/notification/notification.service';
import { ThemeService } from './presentation/core/theme.service';

/**
 * Singleton LocalSettingsAdapter instancié manuellement.
 * Pas @Injectable — partagé entre app.config.ts et les guards.
 */
export const localSettings = new LocalSettingsAdapter();

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    provideAnimationsAsync(),
    provideHttpClient(),

    // LocalSettings — singleton partagé
    { provide: LocalSettingsAdapter, useValue: localSettings },
    { provide: LOCAL_SETTINGS_PORT, useValue: localSettings },

    // Storage — IndexedDB
    { provide: STORAGE_PORT, useExisting: IndexedDBAdapter },

    // Initialisation IndexedDB avant premier rendu
    {
      provide: APP_INITIALIZER,
      useFactory: (db: IndexedDBAdapter) => () => db.init(),
      deps: [IndexedDBAdapter],
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

    // Service Worker — actif uniquement en production (désactivé en dev pour éviter les conflits de cache)
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),

    // Port Notification — remappage vers NotificationService
    { provide: NOTIFICATION_PORT, useExisting: NotificationService },

    // Ports IA — AnthropicAdapter gère lui-même le cas "clé absente" (retourne null)
    // La factory statique causait un bug : si la clé était ajoutée après démarrage,
    // les ports restaient liés à NullAIAdapter pour toute la session.
    { provide: MEAL_ANALYSIS_PORT, useExisting: AnthropicAdapter },
    { provide: NOTE_TAGGING_PORT,  useExisting: AnthropicAdapter },
    { provide: ANALYSIS_PORT,      useExisting: AnthropicAdapter },
    { provide: REPORT_PORT,        useExisting: AnthropicAdapter },
    { provide: COACH_PORT,         useExisting: AnthropicAdapter },
    { provide: API_KEY_TEST_PORT,  useExisting: AnthropicAdapter },
  ],
};
