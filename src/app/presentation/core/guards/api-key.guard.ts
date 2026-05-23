import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LOCAL_SETTINGS_PORT } from '../../../application/tokens';
import type { LocalSettingsRepository } from '../../../domain/repositories/local-settings.repository';

/**
 * Guard fonctionnel protégeant le module Coach.
 *
 * @remarks
 * Redirige vers /settings/api-key si aucune clé API Anthropic
 * n'est configurée dans localStorage. S'applique uniquement au module Coach
 * — les autres modules restent accessibles sans clé.
 * Injecte LOCAL_SETTINGS_PORT (abstraction domain) via hasApiKey() —
 * la clé elle-même ne circule jamais hors de la couche infrastructure.
 *
 * @returns true si la clé est présente, UrlTree vers /settings/api-key sinon
 */
export const apiKeyGuard: CanActivateFn = () => {
  const settings = inject<LocalSettingsRepository>(LOCAL_SETTINGS_PORT);
  const router = inject(Router);
  return settings.hasApiKey() || router.createUrlTree(['/settings', 'api-key']);
};
