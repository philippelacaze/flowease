import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AnalyzeMealPhotoUseCase } from './analyze-meal-photo.usecase';
import { MEAL_ANALYSIS_PORT } from '../tokens';
import { NullAIAdapter } from '../../infrastructure/ai/null/null-ai.adapter';
import type { FoodItemVO } from '../../domain/entities/meal.entity';

const mockItems: FoodItemVO[] = [
  { name: 'Riz blanc', quantity: '150', unit: 'g', fodmap: { level: 'low' }, confirmed: false },
  { name: 'Poulet grillé', fodmap: { level: 'low' }, confirmed: false },
];

describe('AnalyzeMealPhotoUseCase', () => {

  describe('nominal — port IA disponible', () => {
    const mockPort = {
      analyzeMealPhoto: vi.fn(),
      extractMealFromText: vi.fn(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
      mockPort.analyzeMealPhoto.mockResolvedValue(mockItems);
      TestBed.configureTestingModule({
        providers: [
          AnalyzeMealPhotoUseCase,
          { provide: MEAL_ANALYSIS_PORT, useValue: mockPort },
        ],
      });
    });

    it('retourne les aliments identifiés par l\'IA depuis une photo JPEG', async () => {
      const useCase = TestBed.inject(AnalyzeMealPhotoUseCase);
      const result = await useCase.execute({ base64Image: 'abc123==', mediaType: 'image/jpeg' });
      expect(result).toEqual(mockItems);
    });

    it('transmet le base64 et le mediaType exacts au port d\'analyse', async () => {
      const useCase = TestBed.inject(AnalyzeMealPhotoUseCase);
      await useCase.execute({ base64Image: 'xyz==', mediaType: 'image/png' });
      expect(mockPort.analyzeMealPhoto).toHaveBeenCalledWith('xyz==', 'image/png');
    });

    it('retourne un tableau vide si le port retourne un tableau vide', async () => {
      mockPort.analyzeMealPhoto.mockResolvedValue([]);
      const useCase = TestBed.inject(AnalyzeMealPhotoUseCase);
      const result = await useCase.execute({ base64Image: 'abc', mediaType: 'image/jpeg' });
      expect(result).toEqual([]);
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

    it('retourne un tableau vide sans lever d\'exception', async () => {
      const useCase = TestBed.inject(AnalyzeMealPhotoUseCase);
      const result = await useCase.execute({ base64Image: '', mediaType: 'image/jpeg' });
      expect(result).toEqual([]);
    });

    it('ne lève pas d\'exception même si le base64 est vide', async () => {
      const useCase = TestBed.inject(AnalyzeMealPhotoUseCase);
      await expect(useCase.execute({ base64Image: '', mediaType: '' })).resolves.not.toThrow();
    });
  });
});
