import { Injectable, Inject } from '@angular/core';
import type { MealAnalysisPort, MealAnalysisResult } from '../../domain/repositories/ai/meal-analysis.port';
import { MEAL_ANALYSIS_PORT } from '../tokens';

const EMPTY_RESULT: MealAnalysisResult = { items: [], aiFodmapFlags: [] };

/**
 * Extrait les aliments et alertes FODMAP d'une description textuelle ou vocale via l'IA.
 *
 * @remarks
 * Respecte SRP : responsabilité unique d'orchestrer l'extraction textuelle via MealAnalysisPort.
 * Séparé de AnalyzeMealPhotoUseCase (ISP) : les deux méthodes du port ont des flux distincts.
 * Mode dégradé : retourne un résultat vide si le port retourne null (NullAIAdapter ou clé absente).
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
   * Appelle le port d'extraction textuelle et retourne aliments et alertes FODMAP.
   *
   * @param text - Texte décrivant le repas (transcription vocale ou saisie libre)
   * @returns MealAnalysisResult — résultat vide si IA indisponible ou aucun aliment extrait.
   *          L'adapter a déjà notifié l'utilisateur via ErrorNotificationService.
   */
  async execute(text: string): Promise<MealAnalysisResult> {
    return (await this.mealAnalysisPort.extractMealFromText(text)) ?? EMPTY_RESULT;
  }
}
