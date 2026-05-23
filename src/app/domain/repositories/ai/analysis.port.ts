/**
 * Contexte de données transmis à l'IA pour l'analyse de tendances.
 *
 * @remarks
 * Value Object assemblé par RunAiAnalysisUseCase depuis les stores
 * IndexedDB avant l'appel au port. Toutes les données sont sérialisables
 * (pas de Date, uniquement des chaînes ISO 8601).
 */
export interface AnalysisContext {
  readonly windowDays: number;
  readonly symptomsJson: string;
  readonly mealsJson: string;
  readonly intakesJson: string;
  readonly userConditions: readonly string[];
  readonly protocol: string;
}

/** Type d'insight retourné par l'analyse IA. */
export type InsightType =
  | 'correlation'
  | 'pattern'
  | 'alert'
  | 'recommendation';

/**
 * Résultat d'analyse d'un insight individuel.
 *
 * @remarks
 * Value Object imbriqué dans AnalysisResult. confidence entre 0 et 1.
 */
export interface InsightVO {
  readonly type: InsightType;
  readonly title: string;
  readonly description: string;
  readonly confidence: number;
  readonly relatedEntries?: readonly string[];
}

/**
 * Résultat complet d'une analyse IA.
 *
 * @remarks
 * available === false indique le mode dégradé (NullAIAdapter ou erreur réseau).
 * RunAiAnalysisUseCase retourne { available: false } en mode dégradé — jamais throw.
 */
export interface AnalysisResult {
  readonly available: boolean;
  readonly insights: readonly InsightVO[];
  readonly analyzedAt?: Date;
  readonly windowDays?: number;
}

/**
 * Port d'analyse de tendances par intelligence artificielle.
 *
 * @remarks
 * Respecte ISP : responsabilité unique, séparée de MealAnalysisPort
 * et NoteTaggingPort. Implémenté par AnthropicAdapter et NullAIAdapter.
 * Retourne null si l'IA est indisponible — jamais throw.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: ANALYSIS_PORT, useClass: NullAIAdapter }]
 * ```
 */
export interface AnalysisPort {
  /**
   * Analyse les données de santé sur la fenêtre temporelle donnée.
   *
   * @param context - Données agrégées à analyser
   * @returns AnalysisResult avec les insights, ou null si IA indisponible
   */
  analyzeData(context: AnalysisContext): Promise<AnalysisResult | null>;
}
