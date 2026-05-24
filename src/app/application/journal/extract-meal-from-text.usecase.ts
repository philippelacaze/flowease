import { Injectable, Inject } from '@angular/core';
import type { FoodItemVO } from '../../domain/entities/meal.entity';
import type { MealAnalysisPort } from '../../domain/repositories/ai/meal-analysis.port';
import { MEAL_ANALYSIS_PORT } from '../tokens';

/**
 * Extrait les aliments d'une description textuelle ou vocale via l'IA.
 *
 * @remarks
 * Respecte SRP : responsabilité unique d'orchestrer l'extraction textuelle via MealAnalysisPort.
 * Séparé de AnalyzeMealPhotoUseCase (ISP) : les deux méthodes du port ont des flux distincts.
 * Mode dégradé : retourne [] si le port retourne null (NullAIAdapter ou clé absente).
 * Les FoodItemVO retournés ont confirmed = false — l'utilisateur valide les suggestions.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: MEAL_ANALYSIS_PORT, useClass: NullAIAdapter }]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ExtractMealFromTextUseCase {
  constructor(
    @Inject(MEAL_ANALYSIS_PORT) private readonly mealAnalysisPort: MealAnalysisPort,
  ) {}

  /**
   * Appelle le port d'extraction textuelle et retourne les aliments identifiés.
   *
   * @param text - Texte décrivant le repas (transcription vocale ou saisie libre)
   * @returns FoodItemVO[] si l'IA a répondu (liste vide = rien extrait),
   *          null si l'IA est indisponible (clé absente ou erreur réseau/HTTP).
   */
  async execute(text: string): Promise<FoodItemVO[] | null> {
    return this.mealAnalysisPort.extractMealFromText(text);
  }
}
