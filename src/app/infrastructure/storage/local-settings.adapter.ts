/**
 * Adapter de persistance des préférences utilisateur via localStorage.
 *
 * @remarks
 * Ne jamais logger la valeur retournée par getApiKey() — ni en dev,
 * ni dans les messages d'erreur, ni dans les outils de monitoring.
 * Instancié directement dans app.config.ts (pas via @Injectable).
 *
 * Exemple d'instanciation :
 * ```typescript
 * export const localSettings = new LocalSettingsAdapter();
 * ```
 */

const KEYS = {
  API_KEY: 'flowease_api_key',
  LANGUAGE: 'flowease_language',
  THEME: 'flowease_theme',
  COACH_MODE: 'flowease_coach_mode',
  DEFAULT_WINDOW: 'flowease_default_window',
  LAST_ANALYSIS_DATE: 'flowease_last_analysis_date',
  SHOW_TOKEN_COUNTER: 'flowease_show_token_counter',
} as const;

export class LocalSettingsAdapter {
  /**
   * Indique si une clé API Anthropic est configurée.
   *
   * @returns true si une clé est présente — jamais la clé elle-même
   */
  hasApiKey(): boolean {
    return localStorage.getItem(KEYS.API_KEY) !== null;
  }

  /**
   * Retourne la clé API Anthropic stockée, ou null si absente.
   *
   * @remarks
   * Ne jamais logger la valeur retournée. Retourne null si la clé
   * n'a pas été configurée — ne jamais retourner de valeur par défaut.
   *
   * @returns La clé API ou null
   */
  getApiKey(): string | null {
    return localStorage.getItem(KEYS.API_KEY);
  }

  /**
   * Persiste la clé API Anthropic.
   *
   * @param key - Clé API à stocker
   */
  setApiKey(key: string): void {
    localStorage.setItem(KEYS.API_KEY, key);
  }

  /** Supprime la clé API du stockage. */
  clearApiKey(): void {
    localStorage.removeItem(KEYS.API_KEY);
  }

  /**
   * Retourne la langue de l'interface.
   *
   * @returns Code langue ('fr' | 'en') ou 'fr' par défaut
   */
  getLanguage(): string {
    return localStorage.getItem(KEYS.LANGUAGE) ?? 'fr';
  }

  /**
   * @param language - Code langue à persister
   */
  setLanguage(language: string): void {
    localStorage.setItem(KEYS.LANGUAGE, language);
  }

  /**
   * Retourne le thème actif.
   *
   * @returns 'light' | 'dark' | 'auto' — 'auto' par défaut
   */
  getTheme(): string {
    return localStorage.getItem(KEYS.THEME) ?? 'auto';
  }

  /**
   * @param theme - Thème à persister
   */
  setTheme(theme: string): void {
    localStorage.setItem(KEYS.THEME, theme);
  }

  /**
   * Retourne le mode Coach actif.
   *
   * @returns Mode coach ou 'standard' par défaut
   */
  getCoachMode(): string {
    return localStorage.getItem(KEYS.COACH_MODE) ?? 'standard';
  }

  /**
   * @param mode - Mode coach à persister
   */
  setCoachMode(mode: string): void {
    localStorage.setItem(KEYS.COACH_MODE, mode);
  }

  /**
   * Retourne la fenêtre temporelle par défaut pour les analyses.
   *
   * @returns Nombre de jours (7, 14, 30, 90) ou 14 par défaut
   */
  getDefaultWindow(): number {
    const raw = localStorage.getItem(KEYS.DEFAULT_WINDOW);
    return raw ? parseInt(raw, 10) : 14;
  }

  /**
   * @param days - Fenêtre en jours à persister
   */
  setDefaultWindow(days: number): void {
    localStorage.setItem(KEYS.DEFAULT_WINDOW, String(days));
  }

  /**
   * Retourne la date de dernière analyse IA, ou null si jamais lancée.
   *
   * @returns Date ou null
   */
  getLastAnalysisDate(): Date | null {
    const raw = localStorage.getItem(KEYS.LAST_ANALYSIS_DATE);
    return raw ? new Date(raw) : null;
  }

  /**
   * @param date - Date de dernière analyse à persister
   */
  setLastAnalysisDate(date: Date): void {
    localStorage.setItem(KEYS.LAST_ANALYSIS_DATE, date.toISOString());
  }

  /**
   * Retourne si le compteur de tokens est affiché dans l'interface Coach.
   *
   * @returns true si le compteur doit être affiché
   */
  getShowTokenCounter(): boolean {
    return localStorage.getItem(KEYS.SHOW_TOKEN_COUNTER) === 'true';
  }

  /**
   * @param show - Visibilité du compteur de tokens
   */
  setShowTokenCounter(show: boolean): void {
    localStorage.setItem(KEYS.SHOW_TOKEN_COUNTER, String(show));
  }
}
