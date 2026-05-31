import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AddMealUseCase } from './add-meal.usecase';
import { STORAGE_PORT } from '../tokens';

function makeStorageMock() {
  return {
    get: vi.fn(),
    getAll: vi.fn(),
    getRange: vi.fn(),
    save: vi.fn().mockResolvedValue('generated-id'),
    delete: vi.fn(),
    clear: vi.fn(),
  };
}

const baseInput = {
  occurredAt: new Date('2026-05-23T12:00:00'),
  type: 'lunch' as const,
  inputMode: 'text' as const,
  items: [{ name: 'Riz blanc', fodmap: { level: 'low' as const }, confirmed: true }],
};

describe('AddMealUseCase', () => {

  describe('nominal — stockage disponible', () => {
    let mockStorage: ReturnType<typeof makeStorageMock>;

    beforeEach(() => {
      mockStorage = makeStorageMock();
      TestBed.configureTestingModule({
        providers: [
          AddMealUseCase,
          { provide: STORAGE_PORT, useValue: mockStorage },
        ],
      });
    });

    it('assigne un UUID à chaque repas créé', async () => {
      const useCase = TestBed.inject(AddMealUseCase);
      await useCase.execute(baseInput);
      const savedMeal = mockStorage.save.mock.calls[0][1];
      expect(savedMeal.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('assigne un timestamp createdAt automatiquement', async () => {
      const before = Date.now();
      const useCase = TestBed.inject(AddMealUseCase);
      await useCase.execute(baseInput);
      const after = Date.now();
      const savedMeal = mockStorage.save.mock.calls[0][1];
      expect(savedMeal.createdAt).toBeInstanceOf(Date);
      expect(savedMeal.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(savedMeal.createdAt.getTime()).toBeLessThanOrEqual(after);
    });

    it('persiste dans le store meals avec les données saisies', async () => {
      const useCase = TestBed.inject(AddMealUseCase);
      await useCase.execute(baseInput);
      expect(mockStorage.save).toHaveBeenCalledWith(
        'meals',
        expect.objectContaining({
          type: 'lunch',
          inputMode: 'text',
          occurredAt: baseInput.occurredAt,
          items: baseInput.items,
        }),
      );
    });

    it('deux exécutions successives produisent deux UUID distincts', async () => {
      const useCase = TestBed.inject(AddMealUseCase);
      await useCase.execute(baseInput);
      await useCase.execute(baseInput);
      const id1 = mockStorage.save.mock.calls[0][1].id;
      const id2 = mockStorage.save.mock.calls[1][1].id;
      expect(id1).not.toBe(id2);
    });

    it('inclut la note optionnelle si fournie', async () => {
      const useCase = TestBed.inject(AddMealUseCase);
      await useCase.execute({ ...baseInput, notes: 'Repas léger' });
      expect(mockStorage.save).toHaveBeenCalledWith(
        'meals',
        expect.objectContaining({ notes: 'Repas léger' }),
      );
    });

    it('persiste les alertes FODMAP IA quand elles sont fournies', async () => {
      const useCase = TestBed.inject(AddMealUseCase);
      const flags = [
        { item: 'Oignon', reason: 'Contient des fructanes', severity: 'danger' as const },
      ];
      await useCase.execute({ ...baseInput, aiFodmapFlags: flags });
      expect(mockStorage.save).toHaveBeenCalledWith(
        'meals',
        expect.objectContaining({ aiFodmapFlags: flags }),
      );
    });

    it('n\'inclut pas aiFodmapFlags si absent de l\'input', async () => {
      const useCase = TestBed.inject(AddMealUseCase);
      await useCase.execute(baseInput);
      const savedMeal = mockStorage.save.mock.calls[0][1];
      expect(savedMeal.aiFodmapFlags).toBeUndefined();
    });
  });

  describe('erreur storage — save échoue', () => {
    const storageError = new Error('IndexedDB indisponible');

    beforeEach(() => {
      const failingStorage = {
        get: vi.fn(),
        getAll: vi.fn(),
        getRange: vi.fn(),
        save: vi.fn().mockRejectedValue(storageError),
        delete: vi.fn(),
        clear: vi.fn(),
      };
      TestBed.configureTestingModule({
        providers: [
          AddMealUseCase,
          { provide: STORAGE_PORT, useValue: failingStorage },
        ],
      });
    });

    it('propage l\'erreur storage sans la masquer', async () => {
      const useCase = TestBed.inject(AddMealUseCase);
      await expect(useCase.execute(baseInput)).rejects.toThrow('IndexedDB indisponible');
    });
  });
});
