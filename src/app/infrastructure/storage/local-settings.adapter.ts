import type { CoachContextWindow } from '../../domain/entities/coach-session.entity';

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
  COACH_SUGGESTIONS: 'flowease_coach_suggestions',
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
   * Retourne la fenêtre de contexte par défaut pour les sessions Coach.
   *
   * @remarks
   * Gère la migration des anciennes valeurs numériques ('7', '14', '30')
   * vers les clés CoachContextWindow ('7d', '14d', '30d'). Fallback : '14d'.
   *
   * @returns Clé CoachContextWindow valide
   */
  getDefaultContextWindow(): CoachContextWindow {
    const raw = localStorage.getItem(KEYS.DEFAULT_WINDOW);
    const VALID: readonly CoachContextWindow[] = ['today', '7d', '14d', '30d', 'profile_only'];
    const LEGACY: Record<string, CoachContextWindow> = {
      '7': '7d', '14': '14d', '30': '30d', 'profile': 'profile_only',
    };
    if (!raw) return '7d';
    if (VALID.includes(raw as CoachContextWindow)) return raw as CoachContextWindow;
    return LEGACY[raw] ?? '7d';
  }

  /**
   * @param window - Fenêtre de contexte à persister
   */
  setDefaultContextWindow(window: CoachContextWindow): void {
    localStorage.setItem(KEYS.DEFAULT_WINDOW, window);
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

  /**
   * Retourne si les suggestions proactives du Coach sont affichées dans le journal.
   *
   * @returns true si activé — false par défaut
   */
  getCoachSuggestions(): boolean {
    return localStorage.getItem(KEYS.COACH_SUGGESTIONS) === 'true';
  }

  /**
   * @param enabled - true pour activer les suggestions dans le journal
   */
  setCoachSuggestions(enabled: boolean): void {
    localStorage.setItem(KEYS.COACH_SUGGESTIONS, String(enabled));
  }
}
