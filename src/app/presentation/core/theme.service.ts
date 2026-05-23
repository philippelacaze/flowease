import { Injectable, inject } from '@angular/core';
import { LOCAL_SETTINGS_PORT } from '../../application/tokens';
import type { LocalSettingsRepository } from '../../domain/repositories/local-settings.repository';

/**
 * Applique la classe CSS de thème sur <html> en fonction de la préférence stockée.
 *
 * @remarks
 * Respecte SRP : responsabilité unique d'application du thème visuel.
 * Trois valeurs possibles : 'light' (force clair), 'dark' (force sombre),
 * 'auto' (suit prefers-color-scheme — aucune classe posée).
 * Doit être appelé au démarrage (APP_INITIALIZER) et à chaque changement de préférence.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly settings = inject<LocalSettingsRepository>(LOCAL_SETTINGS_PORT as never);

  /**
   * Applique le thème sur document.documentElement.
   *
   * @param theme - 'light' | 'dark' | 'auto' — si omis, lit depuis LOCAL_SETTINGS_PORT
   */
  apply(theme?: string): void {
    const value = theme ?? this.settings.getTheme();
    const root = document.documentElement;
    root.classList.remove('theme-dark', 'theme-light');
    if (value === 'dark') root.classList.add('theme-dark');
    else if (value === 'light') root.classList.add('theme-light');
    // 'auto' → aucune classe, prefers-color-scheme prend le relais
  }
}
