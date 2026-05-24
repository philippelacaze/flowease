import {
  ApplicationConfig,
  APP_INITIALIZER,
  provideBrowserGlobalErrorListeners,
  inject,
} from '@angular/core';
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
} from './application/tokens';
import { IndexedDBAdapter } from './infrastructure/storage/indexeddb.adapter';
import { LocalSettingsAdapter } from './infrastructure/storage/local-settings.adapter';
import { AnthropicAdapter } from './infrastructure/ai/anthropic/anthropic.adapter';
import { NullAIAdapter } from './infrastructure/ai/null/null-ai.adapter';
import { ThemeService } from './presentation/core/theme.service';

/**
 * Singleton LocalSettingsAdapter instancié manuellement.
 * Pas @Injectable — partagé entre app.config.ts et les guards.
 */
export const localSettings = new LocalSettingsAdapter();

/**
 * Factory générique pour les ports IA.
 * Retourne AnthropicAdapter si une clé API est configurée, NullAIAdapter sinon.
 * NullAIAdapter est instancié directement (pas de dépendances) pour ne pas
 * l'enregistrer dans le DI en conditions nominales.
 */
function aiPortFactory(anthropic: AnthropicAdapter): unknown {
  return localSettings.getApiKey() ? anthropic : new NullAIAdapter();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
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

    // Ports IA — factory : AnthropicAdapter si clé présente, new NullAIAdapter() sinon
    { provide: MEAL_ANALYSIS_PORT, useFactory: aiPortFactory, deps: [AnthropicAdapter] },
    { provide: NOTE_TAGGING_PORT,  useFactory: aiPortFactory, deps: [AnthropicAdapter] },
    { provide: ANALYSIS_PORT,      useFactory: aiPortFactory, deps: [AnthropicAdapter] },
    { provide: REPORT_PORT,        useFactory: aiPortFactory, deps: [AnthropicAdapter] },
    { provide: COACH_PORT,         useFactory: aiPortFactory, deps: [AnthropicAdapter] },
    // Test de clé — toujours AnthropicAdapter (appel réseau réel requis)
    { provide: API_KEY_TEST_PORT,  useExisting: AnthropicAdapter },
  ],
};
