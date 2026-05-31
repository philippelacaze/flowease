import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AnalyzeMealPhotoUseCase } from './analyze-meal-photo.usecase';
import { MEAL_ANALYSIS_PORT } from '../tokens';
import { NullAIAdapter } from '../../infrastructure/ai/null/null-ai.adapter';
import type { MealAnalysisResult } from '../../domain/repositories/ai/meal-analysis.port';

const mockResult: MealAnalysisResult = {
  items: [
    { name: 'Riz blanc', quantity: '150', unit: 'g', fodmap: { level: 'low' }, confirmed: false },
    { name: 'Poulet grillé', fodmap: { level: 'low' }, confirmed: false },
  ],
  aiFodmapFlags: [],
};

const mockResultWithFlags: MealAnalysisResult = {
  items: [
    { name: 'Oignon', fodmap: { level: 'high' }, confirmed: false },
  ],
  aiFodmapFlags: [
    { item: 'Oignon', reason: 'Contient des fructanes — fermentation rapide dans le SIBO', severity: 'danger' },
  ],
};

describe('AnalyzeMealPhotoUseCase', () => {

  describe('nominal — port IA disponible', () => {
    const mockPort = {
      analyzeMealPhoto: vi.fn(),
      extractMealFromText: vi.fn(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
      mockPort.analyzeMealPhoto.mockResolvedValue(mockResult);
      TestBed.configureTestingModule({
        providers: [
          AnalyzeMealPhotoUseCase,
          { provide: MEAL_ANALYSIS_PORT, useValue: mockPort },
        ],
      });
    });

    it('retourne les aliments et les alertes FODMAP identifiés depuis une photo JPEG', async () => {
      const useCase = TestBed.inject(AnalyzeMealPhotoUseCase);
      const result = await useCase.execute({ base64Image: 'abc123==', mediaType: 'image/jpeg' });
      expect(result).toEqual(mockResult);
    });

    it('transmet le base64 et le mediaType exacts au port d\'analyse', async () => {
      const useCase = TestBed.inject(AnalyzeMealPhotoUseCase);
      await useCase.execute({ base64Image: 'xyz==', mediaType: 'image/png' });
      expect(mockPort.analyzeMealPhoto).toHaveBeenCalledWith('xyz==', 'image/png');
    });

    it('retourne un résultat vide si le port retourne un résultat sans aliments', async () => {
      mockPort.analyzeMealPhoto.mockResolvedValue({ items: [], aiFodmapFlags: [] });
      const useCase = TestBed.inject(AnalyzeMealPhotoUseCase);
      const result = await useCase.execute({ base64Image: 'abc', mediaType: 'image/jpeg' });
      expect(result.items).toEqual([]);
      expect(result.aiFodmapFlags).toEqual([]);
    });

    it('propage les alertes FODMAP retournées par le port', async () => {
      mockPort.analyzeMealPhoto.mockResolvedValue(mockResultWithFlags);
      const useCase = TestBed.inject(AnalyzeMealPhotoUseCase);
      const result = await useCase.execute({ base64Image: 'abc', mediaType: 'image/jpeg' });
      expect(result.aiFodmapFlags).toHaveLength(1);
      expect(result.aiFodmapFlags[0].severity).toBe('danger');
    });
  });

  describe('mode dégradé — NullAIAdapter injecté', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          AnalyzeMealPhotoUseCase,
          { provide: MEAL_ANALYSIS_PORT, useClass: NullAIAdapter },
        ],
      });
    });

    it('retourne un résultat vide sans lever d\'exception', async () => {
      const useCase = TestBed.inject(AnalyzeMealPhotoUseCase);
      const result = await useCase.execute({ base64Image: '', mediaType: 'image/jpeg' });
      expect(result.items).toEqual([]);
      expect(result.aiFodmapFlags).toEqual([]);
    });

    it('ne lève pas d\'exception même si le base64 est vide', async () => {
      const useCase = TestBed.inject(AnalyzeMealPhotoUseCase);
      await expect(useCase.execute({ base64Image: '', mediaType: '' })).resolves.not.toThrow();
    });
  });
});
