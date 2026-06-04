import { Injectable } from '@angular/core';
import type {
  MealAnalysisResult,
  NoteTaggingResult,
  AnalysisContext,
  AnalysisResult,
  ReportData,
  CoachMessage,
  CoachContext,
} from './ai.service';

/**
 * Implémentation Null Object de AiService.
 *
 * @remarks
 * Pattern Null Object : toutes les méthodes retournent null ou des iterables
 * vides — jamais throw, jamais d'appel réseau.
 * Utilisé dans les tests unitaires via `{ provide: AiService, useClass: NullAiService }`.
 */
@Injectable()
export class NullAiService {

  async analyzeMealPhoto(_base64Image: string, _mediaType: string): Promise<MealAnalysisResult | null> {
    return null;
  }

  async extractMealFromText(_text: string): Promise<MealAnalysisResult | null> {
    return null;
  }

  async tagNote(_content: string): Promise<NoteTaggingResult | null> {
    return null;
  }

  async analyzeData(_context: AnalysisContext): Promise<AnalysisResult | null> {
    return null;
  }

  async generateReportSummary(_data: ReportData): Promise<string | null> {
    return null;
  }

  async *sendMessage(
    _message: string,
    _history: readonly CoachMessage[],
    _context: CoachContext,
  ): AsyncIterable<string> {
    // itérable vide : aucun token émis
  }

  async summarizeSession(_messages: readonly CoachMessage[]): Promise<string | null> {
    return null;
  }

  async testApiKey(_apiKey: string): Promise<string | null> {
    return 'IA non configurée';
  }
}
