/**
 * Résultat du taguage automatique d'une note par l'IA.
 *
 * @remarks
 * Value Object retourné par NoteTaggingPort.tagNote().
 * tags vide et summary vide indiquent que l'IA était indisponible
 * (NullAIAdapter retourne ce cas nominal, jamais null).
 */
export interface NoteTaggingResult {
  readonly tags: readonly string[];
  readonly summary: string;
}

/**
 * Port de taguage automatique des notes par intelligence artificielle.
 *
 * @remarks
 * Respecte ISP : responsabilité unique, séparée de MealAnalysisPort.
 * Implémenté par AnthropicAdapter et NullAIAdapter.
 * Retourne null si l'IA est indisponible — jamais throw.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: NOTE_TAGGING_PORT, useClass: NullAIAdapter }]
 * ```
 */
export interface NoteTaggingPort {
  /**
   * Génère des tags et un résumé court à partir du contenu d'une note.
   *
   * @param content - Contenu textuel de la note
   * @returns Tags et résumé générés, ou null si IA indisponible
   */
  tagNote(content: string): Promise<NoteTaggingResult | null>;
}
