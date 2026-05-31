import type { FoodItemVO, AiFodmapAlert } from '../../entities/meal.entity';

/**
 * Résultat d'une analyse de repas par l'IA.
 *
 * @remarks
 * Regroupe les aliments identifiés et les alertes FODMAP contextuelles
 * en un seul appel IA (évite un second appel pour les alertes).
 *
 * @param items - Aliments identifiés avec confirmed = false
 * @param aiFodmapFlags - Alertes contextuelles pour les aliments FODMAP problématiques
 */
export interface MealAnalysisResult {
  readonly items: ReadonlyArray<FoodItemVO>;
  readonly aiFodmapFlags: ReadonlyArray<AiFodmapAlert>;
}

/**
 * Port d'analyse des repas par intelligence artificielle.
 *
 * @remarks
 * Respecte ISP : sépare l'analyse photo et l'extraction textuelle en
 * deux méthodes distinctes. Implémenté par AnthropicAdapter et NullAIAdapter.
 * Toutes les méthodes retournent null si l'IA est indisponible — jamais throw.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: MEAL_ANALYSIS_PORT, useClass: NullAIAdapter }]
 * ```
 */
export interface MealAnalysisPort {
  /**
   * Analyse une photo de repas et extrait les aliments identifiés ainsi que les alertes FODMAP.
   *
   * @param base64Image - Image encodée en base64
   * @param mediaType - Type MIME de l'image (ex. "image/jpeg")
   * @returns MealAnalysisResult ou null si IA indisponible
   */
  analyzeMealPhoto(base64Image: string, mediaType: string): Promise<MealAnalysisResult | null>;

  /**
   * Extrait les aliments et alertes FODMAP depuis une description textuelle ou vocale.
   *
   * @param text - Texte décrivant le repas (transcription vocale ou saisie libre)
   * @returns MealAnalysisResult ou null si IA indisponible
   */
  extractMealFromText(text: string): Promise<MealAnalysisResult | null>;
}
