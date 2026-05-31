import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { EditMealUseCase } from './edit-meal.usecase';
import { STORAGE_PORT } from '../tokens';
import type { MealEntity } from '../../domain/entities/meal.entity';

const existingMeal: MealEntity = {
  id: 'meal-1',
  occurredAt: new Date('2026-05-20T12:00:00'),
  createdAt: new Date('2026-05-20T12:01:00'),
  type: 'lunch',
  inputMode: 'text',
  items: [{ name: 'Riz blanc', fodmap: { level: 'low' }, confirmed: true }],
};

function makeStorageMock(existing: MealEntity | null = existingMeal) {
  return {
    get: vi.fn().mockResolvedValue(existing ?? undefined),
    getAll: vi.fn(),
    getRange: vi.fn(),
    save: vi.fn().mockResolvedValue('meal-1'),
    delete: vi.fn(),
    clear: vi.fn(),
  };
}

describe('EditMealUseCase', () => {

  describe('nominal — repas existant', () => {
    let mockStorage: ReturnType<typeof makeStorageMock>;

    beforeEach(() => {
      mockStorage = makeStorageMock();
      TestBed.configureTestingModule({
        providers: [
          EditMealUseCase,
          { provide: STORAGE_PORT, useValue: mockStorage },
        ],
      });
    });

    it('lit le repas existant avant de le mettre à jour', async () => {
      const useCase = TestBed.inject(EditMealUseCase);
      await useCase.execute({
        id: 'meal-1',
        occurredAt: new Date(),
        type: 'dinner',
        inputMode: 'text',
        items: existingMeal.items,
      });
      expect(mockStorage.get).toHaveBeenCalledWith('meals', 'meal-1');
    });

    it('sauvegarde le repas avec les données modifiées', async () => {
      const useCase = TestBed.inject(EditMealUseCase);
      const newItems = [{ name: 'Pâtes', fodmap: { level: 'medium' as const }, confirmed: true }];
      await useCase.execute({
        id: 'meal-1',
        occurredAt: existingMeal.occurredAt,
        type: 'dinner',
        inputMode: 'text',
        items: newItems,
      });
      expect(mockStorage.save).toHaveBeenCalledWith(
        'meals',
        expect.objectContaining({ id: 'meal-1', type: 'dinner', items: newItems }),
      );
    });

    it('préserve createdAt depuis l\'entité originale', async () => {
      const useCase = TestBed.inject(EditMealUseCase);
      await useCase.execute({
        id: 'meal-1',
        occurredAt: new Date(),
        type: 'lunch',
        inputMode: 'text',
        items: existingMeal.items,
      });
      const saved = mockStorage.save.mock.calls[0][1];
      expect(saved.createdAt).toEqual(existingMeal.createdAt);
    });

    it('ajoute editedAt à la saisie mise à jour', async () => {
      const before = Date.now();
      const useCase = TestBed.inject(EditMealUseCase);
      await useCase.execute({
        id: 'meal-1',
        occurredAt: new Date(),
        type: 'lunch',
        inputMode: 'text',
        items: existingMeal.items,
      });
      const after = Date.now();
      const saved = mockStorage.save.mock.calls[0][1];
      expect(saved.editedAt).toBeInstanceOf(Date);
      expect(saved.editedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(saved.editedAt.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('id introuvable', () => {
    let mockStorage: ReturnType<typeof makeStorageMock>;

    beforeEach(() => {
      mockStorage = makeStorageMock(null);
      TestBed.configureTestingModule({
        providers: [
          EditMealUseCase,
          { provide: STORAGE_PORT, useValue: mockStorage },
        ],
      });
    });

    it('ne fait rien si le repas n\'existe pas en base', async () => {
      const useCase = TestBed.inject(EditMealUseCase);
      await useCase.execute({
        id: 'inexistant',
        occurredAt: new Date(),
        type: 'lunch',
        inputMode: 'text',
        items: [],
      });
      expect(mockStorage.save).not.toHaveBeenCalled();
    });
  });
});
