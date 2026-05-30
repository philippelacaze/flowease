import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AddSymptomUseCase } from './add-symptom.usecase';
import { STORAGE_PORT } from '../tokens';

function makeStorageMock() {
  return {
    get: vi.fn(),
    getAll: vi.fn(),
    getRange: vi.fn(),
    getAllByIndex: vi.fn(),
    save: vi.fn().mockResolvedValue('generated-id'),
    delete: vi.fn(),
    clear: vi.fn(),
  };
}

const baseInput = {
  occurredAt: new Date('2026-05-23T10:00:00'),
  category: 'digestive' as const,
  symptomKey: 'abdominal_pain',
  intensity: 6,
};

describe('AddSymptomUseCase', () => {

  describe('nominal — stockage disponible', () => {
    let mockStorage: ReturnType<typeof makeStorageMock>;

    beforeEach(() => {
      mockStorage = makeStorageMock();
      TestBed.configureTestingModule({
        providers: [
          AddSymptomUseCase,
          { provide: STORAGE_PORT, useValue: mockStorage },
        ],
      });
    });

    it('retourne l\'id généré par le storage', async () => {
      const useCase = TestBed.inject(AddSymptomUseCase);
      const id = await useCase.execute(baseInput);
      expect(id).toBe('generated-id');
    });

    it('persiste le symptôme avec occurredAt et createdAt', async () => {
      const useCase = TestBed.inject(AddSymptomUseCase);
      await useCase.execute(baseInput);
      const saved = mockStorage.save.mock.calls[0][1] as { occurredAt: Date; createdAt: Date };
      expect(saved.occurredAt).toEqual(baseInput.occurredAt);
      expect(saved.createdAt).toBeInstanceOf(Date);
    });

    it('génère un id UUID distinct à chaque appel', async () => {
      const useCase = TestBed.inject(AddSymptomUseCase);
      await useCase.execute(baseInput);
      await useCase.execute(baseInput);
      const id1 = (mockStorage.save.mock.calls[0][1] as { id: string }).id;
      const id2 = (mockStorage.save.mock.calls[1][1] as { id: string }).id;
      expect(id1).not.toBe(id2);
    });

    it('ne propage pas les champs optionnels absents', async () => {
      const useCase = TestBed.inject(AddSymptomUseCase);
      await useCase.execute(baseInput);
      const saved = mockStorage.save.mock.calls[0][1] as Record<string, unknown>;
      expect(saved['painZones']).toBeUndefined();
      expect(saved['stool']).toBeUndefined();
      expect(saved['gas']).toBeUndefined();
    });
  });

  describe('transit — champs blood / mucus / frequency', () => {
    let mockStorage: ReturnType<typeof makeStorageMock>;

    beforeEach(() => {
      mockStorage = makeStorageMock();
      TestBed.configureTestingModule({
        providers: [
          AddSymptomUseCase,
          { provide: STORAGE_PORT, useValue: mockStorage },
        ],
      });
    });

    it('persiste blood et mucus quand fournis dans stool', async () => {
      const useCase = TestBed.inject(AddSymptomUseCase);
      await useCase.execute({
        ...baseInput,
        symptomKey: 'transit',
        stool: { bristolType: 4, blood: true, mucus: false, frequency: 2 },
      });
      const saved = mockStorage.save.mock.calls[0][1] as { stool: { blood: boolean; mucus: boolean; frequency: number } };
      expect(saved.stool.blood).toBe(true);
      expect(saved.stool.mucus).toBe(false);
      expect(saved.stool.frequency).toBe(2);
    });

    it('persiste stool sans blood ni mucus quand non fournis', async () => {
      const useCase = TestBed.inject(AddSymptomUseCase);
      await useCase.execute({
        ...baseInput,
        symptomKey: 'transit',
        stool: { bristolType: 3 },
      });
      const saved = mockStorage.save.mock.calls[0][1] as { stool: Record<string, unknown> };
      expect(saved.stool['blood']).toBeUndefined();
      expect(saved.stool['mucus']).toBeUndefined();
      expect(saved.stool['frequency']).toBeUndefined();
    });

    it('persiste stool avec bristolType null quand seul blood est renseigné', async () => {
      const useCase = TestBed.inject(AddSymptomUseCase);
      await useCase.execute({
        ...baseInput,
        symptomKey: 'transit',
        stool: { bristolType: null, blood: true },
      });
      const saved = mockStorage.save.mock.calls[0][1] as { stool: { bristolType: null; blood: boolean } };
      expect(saved.stool.bristolType).toBeNull();
      expect(saved.stool.blood).toBe(true);
    });
  });
});
