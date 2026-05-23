import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { GetJournalDayUseCase } from './get-journal-day.usecase';
import { STORAGE_PORT } from '../tokens';
import type { MealEntity } from '../../domain/entities/meal.entity';
import type { SymptomEntity } from '../../domain/entities/symptom.entity';
import type { IntakeEntity } from '../../domain/entities/intake.entity';
import type { NoteEntity } from '../../domain/entities/note.entity';

const day = new Date('2026-05-23T00:00:00');

const meal: MealEntity = {
  id: 'meal-1',
  occurredAt: new Date('2026-05-23T12:00:00'),
  createdAt: new Date('2026-05-23T12:01:00'),
  type: 'lunch',
  inputMode: 'text',
  items: [],
};

const symptom: SymptomEntity = {
  id: 'sym-1',
  occurredAt: new Date('2026-05-23T14:00:00'),
  createdAt: new Date('2026-05-23T14:01:00'),
  category: 'digestive',
  symptomKey: 'abdominal_pain',
  intensity: 5,
};

const intake: IntakeEntity = {
  id: 'intake-1',
  treatmentId: 'treat-1',
  scheduledAt: new Date('2026-05-23T08:00:00'),
  confirmedAt: new Date('2026-05-23T08:05:00'),
  createdAt: new Date('2026-05-23T08:05:00'),
  status: 'taken',
};

const note: NoteEntity = {
  id: 'note-1',
  occurredAt: new Date('2026-05-23T20:00:00'),
  createdAt: new Date('2026-05-23T20:01:00'),
  content: 'Note du soir',
  inputMode: 'text',
  tags: [],
  summary: '',
  linkedEntries: [],
};

function makeStorageMock(overrides: {
  meals?: MealEntity[];
  symptoms?: SymptomEntity[];
  intakes?: IntakeEntity[];
  notes?: NoteEntity[];
} = {}) {
  const { meals = [], symptoms = [], intakes = [], notes = [] } = overrides;
  return {
    get: vi.fn(),
    getAll: vi.fn(),
    getRange: vi.fn().mockImplementation((store: string) => {
      if (store === 'meals') return Promise.resolve(meals);
      if (store === 'symptoms') return Promise.resolve(symptoms);
      if (store === 'intakes') return Promise.resolve(intakes);
      if (store === 'notes') return Promise.resolve(notes);
      return Promise.resolve([]);
    }),
    save: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
  };
}

describe('GetJournalDayUseCase', () => {

  describe('retour et tri des entrées', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          GetJournalDayUseCase,
          { provide: STORAGE_PORT, useValue: makeStorageMock({ meals: [meal], symptoms: [symptom], intakes: [intake], notes: [note] }) },
        ],
      });
    });

    it('retourne toutes les entrées des 4 stores pour le jour donné', async () => {
      const useCase = TestBed.inject(GetJournalDayUseCase);
      const result = await useCase.execute(day);
      expect(result).toHaveLength(4);
    });

    it('trie les entrées par timestamp croissant', async () => {
      const useCase = TestBed.inject(GetJournalDayUseCase);
      const result = await useCase.execute(day);
      const times = result.map(e =>
        e.kind === 'intake' ? e.data.confirmedAt.getTime() : e.data.occurredAt.getTime(),
      );
      expect(times).toEqual([...times].sort((a, b) => a - b));
    });

    it('inclut bien une entrée de type meal dans le résultat', async () => {
      const useCase = TestBed.inject(GetJournalDayUseCase);
      const result = await useCase.execute(day);
      const kinds = result.map(e => e.kind);
      expect(kinds).toContain('meal');
    });

    it('inclut bien une entrée de type intake dans le résultat', async () => {
      const useCase = TestBed.inject(GetJournalDayUseCase);
      const result = await useCase.execute(day);
      const kinds = result.map(e => e.kind);
      expect(kinds).toContain('intake');
    });

    it('interroge le store intakes sur l\'index confirmedAt', async () => {
      const mockStorage = makeStorageMock();
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          GetJournalDayUseCase,
          { provide: STORAGE_PORT, useValue: mockStorage },
        ],
      });
      const useCase = TestBed.inject(GetJournalDayUseCase);
      await useCase.execute(day);
      expect(mockStorage.getRange).toHaveBeenCalledWith(
        'intakes',
        'confirmedAt',
        expect.any(Date),
        expect.any(Date),
      );
    });
  });

  describe('jour sans entrées', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          GetJournalDayUseCase,
          { provide: STORAGE_PORT, useValue: makeStorageMock() },
        ],
      });
    });

    it('retourne un tableau vide si aucune entrée ce jour', async () => {
      const useCase = TestBed.inject(GetJournalDayUseCase);
      const result = await useCase.execute(day);
      expect(result).toEqual([]);
    });
  });

  describe('erreur storage', () => {
    beforeEach(() => {
      const failingStorage = {
        get: vi.fn(),
        getAll: vi.fn(),
        getRange: vi.fn().mockRejectedValue(new Error('IndexedDB indisponible')),
        save: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
      };
      TestBed.configureTestingModule({
        providers: [
          GetJournalDayUseCase,
          { provide: STORAGE_PORT, useValue: failingStorage },
        ],
      });
    });

    it('propage l\'erreur storage sans la masquer', async () => {
      const useCase = TestBed.inject(GetJournalDayUseCase);
      await expect(useCase.execute(day)).rejects.toThrow('IndexedDB indisponible');
    });
  });
});
