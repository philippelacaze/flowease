import { Injectable, Inject } from '@angular/core';
import type { FoodItemVO } from '../../domain/entities/meal.entity';
import type { MealAnalysisPort } from '../../domain/repositories/ai/meal-analysis.port';
import { MEAL_ANALYSIS_PORT } from '../tokens';

/**
 * Paramètres requis pour analyser une photo de repas.
 *
 * @remarks
 * base64Image et mediaType sont fournis par PhotoInputComponent.
 */
export interface AnalyzeMealPhotoInput {
  readonly base64Image: string;
  readonly mediaType: string;
}

/**
 * Analyse une photo de repas via l'IA pour en extraire les aliments identifiés.
 *
 * @remarks
 * Respecte SRP : responsabilité unique d'orchestrer l'analyse photo via MealAnalysisPort.
 * Mode dégradé : retourne [] si le port retourne null (NullAIAdapter ou clé absente).
 * Les FoodItemVO retournés ont confirmed = false — l'utilisateur valide les suggestions.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: MEAL_ANALYSIS_PORT, useClass: NullAIAdapter }]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class AnalyzeMealPhotoUseCase {
  constructor(
    @Inject(MEAL_ANALYSIS_PORT) private readonly mealAnalysisPort: MealAnalysisPort,
  ) {}

  /**
   * Appelle le port d'analyse photo et retourne les aliments identifiés.
   *
   * @param input - Image en base64 et type MIME
   * @returns FoodItemVO[] si l'IA a répondu (liste vide = aucun aliment détecté),
   *          null si l'IA est indisponible (clé absente ou erreur réseau/HTTP).
   *          L'adapter a déjà notifié l'utilisateur dans les deux cas d'erreur.
   */
  async execute(input: AnalyzeMealPhotoInput): Promise<FoodItemVO[] | null> {
    return this.mealAnalysisPort.analyzeMealPhoto(input.base64Image, input.mediaType);
  }
}
