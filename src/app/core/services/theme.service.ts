import { Injectable, inject } from '@angular/core';
import { LocalSettingsService } from '../../core/services/local-settings.service';

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
  private readonly settings = inject(LocalSettingsService);

  /**
   * Applique le thème sur document.documentElement.
   *
   * @param theme - 'light' | 'dark' | 'auto' — si omis, lit depuis LOCAL_SETTINGS_PORT
   */
  apply(theme?: string): void {
    const value = theme ?? this.settings.getTheme();
    const root = document.documentElement;
    root.removeAttribute('data-theme');
    if (value === 'dark') root.setAttribute('data-theme', 'dark');
    else if (value === 'light') root.setAttribute('data-theme', 'light');
    // 'auto' → pas d'attribut, prefers-color-scheme prend le relais
  }
}