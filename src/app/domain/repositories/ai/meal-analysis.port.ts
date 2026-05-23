import type { FoodItemVO } from '../../entities/meal.entity';

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
   * Analyse une photo de repas et extrait les aliments identifiés.
   *
   * @param base64Image - Image encodée en base64
   * @param mediaType - Type MIME de l'image (ex. "image/jpeg")
   * @returns Liste de FoodItemVO avec confirmed = false, ou null si IA indisponible
   */
  analyzeMealPhoto(base64Image: string, mediaType: string): Promise<FoodItemVO[] | null>;

  /**
   * Extrait les aliments depuis une description textuelle ou vocale.
   *
   * @param text - Texte décrivant le repas (transcription vocale ou saisie libre)
   * @returns Liste de FoodItemVO avec confirmed = false, ou null si IA indisponible
   */
  extractMealFromText(text: string): Promise<FoodItemVO[] | null>;
}
