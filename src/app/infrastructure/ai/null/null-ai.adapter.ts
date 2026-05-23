import { Injectable } from '@angular/core';
import type { FoodItemVO } from '../../../domain/entities/meal.entity';
import type { MealAnalysisPort } from '../../../domain/repositories/ai/meal-analysis.port';
import type { NoteTaggingPort, NoteTaggingResult } from '../../../domain/repositories/ai/note-tagging.port';
import type { AnalysisPort, AnalysisContext, AnalysisResult } from '../../../domain/repositories/ai/analysis.port';
import type { ReportPort, ReportData } from '../../../domain/repositories/ai/report.port';
import type { CoachMessage, CoachContext, CoachPort } from '../../../domain/repositories/ai/coach.port';

/**
 * Implémentation Null Object de tous les ports IA.
 *
 * @remarks
 * Respecte le pattern Null Object (GoF) : toutes les méthodes retournent
 * null ou des iterables vides — jamais throw, jamais d'appel réseau.
 * Double usage :
 * 1. Mode dégradé en production quand aucune clé API n'est configurée
 * 2. Tests unitaires — injecté via { provide: PORT_TOKEN, useClass: NullAIAdapter }
 *
 * Toute nouvelle méthode ajoutée à un port IA DOIT être ajoutée ici.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: MEAL_ANALYSIS_PORT, useClass: NullAIAdapter }]
 * ```
 */
@Injectable()
export class NullAIAdapter implements MealAnalysisPort, NoteTaggingPort, AnalysisPort, ReportPort, CoachPort {

  // --- MealAnalysisPort ---

  /**
   * @returns null — IA indisponible
   */
  async analyzeMealPhoto(_base64Image: string, _mediaType: string): Promise<FoodItemVO[] | null> {
    return null;
  }

  /**
   * @returns null — IA indisponible
   */
  async extractMealFromText(_text: string): Promise<FoodItemVO[] | null> {
    return null;
  }

  // --- NoteTaggingPort ---

  /**
   * @returns null — IA indisponible
   */
  async tagNote(_content: string): Promise<NoteTaggingResult | null> {
    return null;
  }

  // --- AnalysisPort ---

  /**
   * @returns null — IA indisponible
   */
  async analyzeData(_context: AnalysisContext): Promise<AnalysisResult | null> {
    return null;
  }

  // --- ReportPort ---

  /**
   * @returns null — IA indisponible
   */
  async generateReportSummary(_data: ReportData): Promise<string | null> {
    return null;
  }

  // --- CoachPort ---

  /**
   * @returns Iterable vide — IA indisponible
   */
  async *sendMessage(
    _message: string,
    _history: readonly CoachMessage[],
    _context: CoachContext,
  ): AsyncIterable<string> {
    // itérable vide : aucun token émis
  }

  /**
   * @returns null — IA indisponible
   */
  async summarizeSession(_messages: readonly CoachMessage[]): Promise<string | null> {
    return null;
  }
}
