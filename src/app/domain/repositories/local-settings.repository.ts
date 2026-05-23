/**
 * Port de lecture/écriture des préférences UI stockées localement.
 *
 * @remarks
 * Respecte ISP : responsabilité unique — accès au localStorage via une
 * abstraction testable. Implémenté par LocalSettingsAdapter (infrastructure).
 * hasApiKey() expose uniquement un boolean — la clé elle-même reste dans
 * l'infrastructure et ne circule jamais dans la couche application ou présentation.
 * Le profil médical (UserProfileEntity) est stocké dans IndexedDB via STORAGE_PORT,
 * pas ici — pour isoler les données médicales du localStorage.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: LOCAL_SETTINGS_PORT, useValue: fakeSettings }]
 * ```
 */
export interface LocalSettingsRepository {
  /**
   * Indique si une clé API Anthropic est configurée.
   * Retourne un boolean — jamais la clé elle-même.
   *
   * @returns true si une clé est présente dans le stockage local
   */
  hasApiKey(): boolean;

  /**
   * Retourne la date de la dernière analyse IA, ou null si jamais lancée.
   *
   * @returns Date ou null
   */
  getLastAnalysisDate(): Date | null;

  /**
   * Persiste la date de la dernière analyse IA.
   *
   * @param date - Date à enregistrer
   */
  setLastAnalysisDate(date: Date): void;

  /**
   * Retourne la langue de l'interface configurée par l'utilisateur.
   *
   * @returns Code langue ('fr' | 'en') — 'fr' par défaut
   */
  getLanguage(): string;

  /**
   * Indique si le compteur de tokens doit être affiché dans l'interface Coach.
   *
   * @returns true si le compteur est activé dans les préférences
   */
  getShowTokenCounter(): boolean;

  /**
   * Retourne le thème configuré par l'utilisateur.
   *
   * @returns 'light' | 'dark' | 'auto' — 'auto' par défaut
   */
  getTheme(): string;

  /**
   * Persiste le thème choisi par l'utilisateur.
   *
   * @param theme - 'light' | 'dark' | 'auto'
   */
  setTheme(theme: string): void;
}
