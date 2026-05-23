import { describe, it, expect, beforeEach } from 'vitest';
import { NullAIAdapter } from './null-ai.adapter';
import type { AnalysisContext } from '../../../domain/repositories/ai/analysis.port';
import type { ReportData } from '../../../domain/repositories/ai/report.port';
import type { CoachMessage, CoachContext } from '../../../domain/repositories/ai/coach.port';

const COACH_CONTEXT: CoachContext = {
  contextWindow: 'today',
  userConditions: [],
  protocol: '',
  activeTreatments: [],
};

const ANALYSIS_CONTEXT: AnalysisContext = {
  windowDays: 14,
  symptomsJson: '[]',
  mealsJson: '[]',
  intakesJson: '[]',
  userConditions: [],
  protocol: '',
};

const REPORT_DATA: ReportData = {
  sections: [],
  windowDays: 7,
  userConditions: [],
};

describe('NullAIAdapter — pattern Null Object', () => {
  let adapter: NullAIAdapter;

  beforeEach(() => {
    adapter = new NullAIAdapter();
  });

  // --- MealAnalysisPort ---

  describe('analyzeMealPhoto', () => {
    it('retourne null sans lever d\'exception', async () => {
      await expect(adapter.analyzeMealPhoto('base64', 'image/jpeg')).resolves.toBeNull();
    });
  });

  describe('extractMealFromText', () => {
    it('retourne null sans lever d\'exception', async () => {
      await expect(adapter.extractMealFromText('soupe de légumes')).resolves.toBeNull();
    });
  });

  // --- NoteTaggingPort ---

  describe('tagNote', () => {
    it('retourne null sans lever d\'exception', async () => {
      await expect(adapter.tagNote('note de test')).resolves.toBeNull();
    });
  });

  // --- AnalysisPort ---

  describe('analyzeData', () => {
    it('retourne null sans lever d\'exception', async () => {
      await expect(adapter.analyzeData(ANALYSIS_CONTEXT)).resolves.toBeNull();
    });
  });

  // --- ReportPort ---

  describe('generateReportSummary', () => {
    it('retourne null sans lever d\'exception', async () => {
      await expect(adapter.generateReportSummary(REPORT_DATA)).resolves.toBeNull();
    });
  });

  // --- CoachPort ---

  describe('sendMessage', () => {
    it('retourne un itérable vide sans lever d\'exception', async () => {
      const history: readonly CoachMessage[] = [
        { role: 'user', content: 'bonjour' },
      ];

      const tokens: string[] = [];
      for await (const token of adapter.sendMessage('bonjour', history, COACH_CONTEXT)) {
        tokens.push(token);
      }
      expect(tokens).toEqual([]);
    });
  });

  describe('summarizeSession', () => {
    it('retourne null sans lever d\'exception', async () => {
      const messages: readonly CoachMessage[] = [
        { role: 'user', content: 'bonjour' },
        { role: 'assistant', content: 'Bonsoir, comment puis-je vous aider ?' },
      ];
      await expect(adapter.summarizeSession(messages)).resolves.toBeNull();
    });
  });

  // --- Vérification globale : aucune méthode ne throw ---

  it('aucune méthode ne lève d\'exception quel que soit l\'input', async () => {
    await expect(adapter.analyzeMealPhoto('', '')).resolves.not.toThrow();
    await expect(adapter.extractMealFromText('')).resolves.not.toThrow();
    await expect(adapter.tagNote('')).resolves.not.toThrow();
    await expect(adapter.analyzeData(ANALYSIS_CONTEXT)).resolves.not.toThrow();
    await expect(adapter.generateReportSummary(REPORT_DATA)).resolves.not.toThrow();
    await expect(adapter.summarizeSession([])).resolves.not.toThrow();
  });
});
