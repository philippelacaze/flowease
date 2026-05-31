import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ExtractMealFromTextUseCase } from './extract-meal-from-text.usecase';
import { MEAL_ANALYSIS_PORT } from '../tokens';
import { NullAIAdapter } from '../../infrastructure/ai/null/null-ai.adapter';
import type { MealAnalysisResult } from '../../domain/repositories/ai/meal-analysis.port';

const mockResult: MealAnalysisResult = {
  items: [
    { name: 'Pâtes complètes', quantity: '200', unit: 'g', fodmap: { level: 'medium' }, confirmed: false },
    { name: 'Sauce tomate', fodmap: { level: 'low' }, confirmed: false },
  ],
  aiFodmapFlags: [
    { item: 'Pâtes complètes', reason: 'Blé complet — source modérée de fructanes selon la portion', severity: 'warning' },
  ],
};

describe('ExtractMealFromTextUseCase', () => {

  describe('nominal — port IA disponible', () => {
    const mockPort = {
      analyzeMealPhoto: vi.fn(),
      extractMealFromText: vi.fn(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
      mockPort.extractMealFromText.mockResolvedValue(mockResult);
      TestBed.configureTestingModule({
        providers: [
          ExtractMealFromTextUseCase,
          { provide: MEAL_ANALYSIS_PORT, useValue: mockPort },
        ],
      });
    });

    it('retourne les aliments et alertes FODMAP extraits de la description textuelle', async () => {
      const useCase = TestBed.inject(ExtractMealFromTextUseCase);
      const result = await useCase.execute('j\'ai mangé des pâtes avec de la sauce tomate');
      expect(result).toEqual(mockResult);
    });

    it('transmet le texte exact au port d\'extraction', async () => {
      const useCase = TestBed.inject(ExtractMealFromTextUseCase);
      const texte = 'riz basmati et haricots verts vapeur';
      await useCase.execute(texte);
      expect(mockPort.extractMealFromText).toHaveBeenCalledWith(texte);
    });

    it('retourne un résultat vide si le port ne détecte aucun aliment', async () => {
      mockPort.extractMealFromText.mockResolvedValue({ items: [], aiFodmapFlags: [] });
      const useCase = TestBed.inject(ExtractMealFromTextUseCase);
      const result = await useCase.execute('je n\'ai rien mangé');
      expect(result.items).toEqual([]);
      expect(result.aiFodmapFlags).toEqual([]);
    });

    it('propage les alertes FODMAP retournées par le port', async () => {
      const useCase = TestBed.inject(ExtractMealFromTextUseCase);
      const result = await useCase.execute('des pâtes');
      expect(result.aiFodmapFlags).toHaveLength(1);
      expect(result.aiFodmapFlags[0].severity).toBe('warning');
    });
  });

  describe('mode dégradé — NullAIAdapter injecté', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          ExtractMealFromTextUseCase,
          { provide: MEAL_ANALYSIS_PORT, useClass: NullAIAdapter },
        ],
      });
    });

    it('retourne un résultat vide sans lever d\'exception', async () => {
      const useCase = TestBed.inject(ExtractMealFromTextUseCase);
      const result = await useCase.execute('riz et légumes');
      expect(result.items).toEqual([]);
      expect(result.aiFodmapFlags).toEqual([]);
    });

    it('ne lève pas d\'exception même si le texte est vide', async () => {
      const useCase = TestBed.inject(ExtractMealFromTextUseCase);
      await expect(useCase.execute('')).resolves.not.toThrow();
    });
  });
});
