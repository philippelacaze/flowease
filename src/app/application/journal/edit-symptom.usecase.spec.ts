import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { EditSymptomUseCase } from './edit-symptom.usecase';
import { STORAGE_PORT } from '../tokens';
import type { SymptomEntity } from '../../domain/entities/symptom.entity';

const existingSymptom: SymptomEntity = {
  id: 'sym-1',
  occurredAt: new Date('2026-05-20T10:00:00'),
  createdAt: new Date('2026-05-20T10:01:00'),
  category: 'digestive',
  symptomKey: 'bloating',
  intensity: 4,
};

function makeStorageMock(existing: SymptomEntity | null = existingSymptom) {
  return {
    get: vi.fn().mockResolvedValue(existing ?? undefined),
    getAll: vi.fn(),
    getRange: vi.fn(),
    save: vi.fn().mockResolvedValue('sym-1'),
    delete: vi.fn(),
    clear: vi.fn(),
  };
}

describe('EditSymptomUseCase', () => {

  describe('nominal — symptôme existant', () => {
    let mockStorage: ReturnType<typeof makeStorageMock>;

    beforeEach(() => {
      mockStorage = makeStorageMock();
      TestBed.configureTestingModule({
        providers: [
          EditSymptomUseCase,
          { provide: STORAGE_PORT, useValue: mockStorage },
        ],
      });
    });

    it('lit le symptôme existant avant de le mettre à jour', async () => {
      const useCase = TestBed.inject(EditSymptomUseCase);
      await useCase.execute({ ...existingSymptom, intensity: 7 });
      expect(mockStorage.get).toHaveBeenCalledWith('symptoms', 'sym-1');
    });

    it('sauvegarde le symptôme avec l\'intensité modifiée', async () => {
      const useCase = TestBed.inject(EditSymptomUseCase);
      await useCase.execute({ ...existingSymptom, intensity: 8 });
      expect(mockStorage.save).toHaveBeenCalledWith(
        'symptoms',
        expect.objectContaining({ id: 'sym-1', intensity: 8 }),
      );
    });

    it('préserve createdAt depuis l\'entité originale', async () => {
      const useCase = TestBed.inject(EditSymptomUseCase);
      await useCase.execute({ ...existingSymptom, intensity: 3 });
      const saved = mockStorage.save.mock.calls[0][1];
      expect(saved.createdAt).toEqual(existingSymptom.createdAt);
    });

    it('ajoute editedAt au symptôme mis à jour', async () => {
      const before = Date.now();
      const useCase = TestBed.inject(EditSymptomUseCase);
      await useCase.execute({ ...existingSymptom, intensity: 5 });
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
          EditSymptomUseCase,
          { provide: STORAGE_PORT, useValue: mockStorage },
        ],
      });
    });

    it('ne fait rien si le symptôme n\'existe pas en base', async () => {
      const useCase = TestBed.inject(EditSymptomUseCase);
      await useCase.execute({ ...existingSymptom, id: 'inexistant' });
      expect(mockStorage.save).not.toHaveBeenCalled();
    });
  });
});
