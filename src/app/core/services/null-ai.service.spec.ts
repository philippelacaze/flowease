import { describe, it, expect, beforeEach } from 'vitest';
import { NullAiService } from './null-ai.service';
import type { AnalysisContext, ReportData, CoachMessage, CoachContext } from './ai.service';

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

describe('NullAiService — pattern Null Object', () => {
  let service: NullAiService;

  beforeEach(() => {
    service = new NullAiService();
  });

  describe('analyzeMealPhoto', () => {
    it('retourne null sans lever d\'exception', async () => {
      await expect(service.analyzeMealPhoto('base64', 'image/jpeg')).resolves.toBeNull();
    });
  });

  describe('extractMealFromText', () => {
    it('retourne null sans lever d\'exception', async () => {
      await expect(service.extractMealFromText('soupe de légumes')).resolves.toBeNull();
    });
  });

  describe('tagNote', () => {
    it('retourne null sans lever d\'exception', async () => {
      await expect(service.tagNote('note de test')).resolves.toBeNull();
    });
  });

  describe('analyzeData', () => {
    it('retourne null sans lever d\'exception', async () => {
      await expect(service.analyzeData(ANALYSIS_CONTEXT)).resolves.toBeNull();
    });
  });

  describe('generateReportSummary', () => {
    it('retourne null sans lever d\'exception', async () => {
      await expect(service.generateReportSummary(REPORT_DATA)).resolves.toBeNull();
    });
  });

  describe('sendMessage', () => {
    it('retourne un itérable vide sans lever d\'exception', async () => {
      const history: readonly CoachMessage[] = [
        { role: 'user', content: 'bonjour' },
      ];

      const tokens: string[] = [];
      for await (const token of service.sendMessage('bonjour', history, COACH_CONTEXT)) {
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
      await expect(service.summarizeSession(messages)).resolves.toBeNull();
    });
  });

  describe('testApiKey', () => {
    it('retourne un message d\'erreur sans lever d\'exception', async () => {
      const result = await service.testApiKey('une-cle');
      expect(result).toBe('IA non configurée');
    });
  });

  it('aucune méthode ne lève d\'exception quel que soit l\'input', async () => {
    await expect(service.analyzeMealPhoto('', '')).resolves.not.toThrow();
    await expect(service.extractMealFromText('')).resolves.not.toThrow();
    await expect(service.tagNote('')).resolves.not.toThrow();
    await expect(service.analyzeData(ANALYSIS_CONTEXT)).resolves.not.toThrow();
    await expect(service.generateReportSummary(REPORT_DATA)).resolves.not.toThrow();
    await expect(service.summarizeSession([])).resolves.not.toThrow();
  });
});
