import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { GetJournalSuggestionsUseCase } from './get-journal-suggestions.usecase';
import { STORAGE_PORT, LOCAL_SETTINGS_PORT } from '../tokens';
import type { JournalEntry } from './get-journal-day.usecase';
import type { SymptomEntity } from '../../domain/entities/symptom.entity';

const TODAY = new Date('2026-06-01T12:00:00');
const YESTERDAY = new Date('2026-05-31T12:00:00');

const mealEntry: JournalEntry = {
  kind: 'meal',
  data: {
    id: 'm1',
    occurredAt: TODAY,
    createdAt: TODAY,
    type: 'lunch',
    inputMode: 'text',
    items: [],
  },
};

const symptomToday: JournalEntry = {
  kind: 'symptom',
  data: {
    id: 's1',
    occurredAt: TODAY,
    createdAt: TODAY,
    category: 'digestive',
    symptomKey: 'bloating',
    intensity: 7,
  },
};

const symptomYesterday: SymptomEntity = {
  id: 's2',
  occurredAt: YESTERDAY,
  createdAt: YESTERDAY,
  category: 'digestive',
  symptomKey: 'bloating',
  intensity: 5,
};

const symptomDayBefore: SymptomEntity = {
  id: 's3',
  occurredAt: new Date('2026-05-30T12:00:00'),
  createdAt: new Date('2026-05-30T12:00:00'),
  category: 'digestive',
  symptomKey: 'bloating',
  intensity: 3,
};

function makeStorageMock(day1Symptoms: SymptomEntity[] = [], day2Symptoms: SymptomEntity[] = []) {
  return {
    get: vi.fn(),
    getAll: vi.fn(),
    getRange: vi.fn().mockImplementation((_store: string, _index: string, start: Date) => {
      if (start.toDateString() === YESTERDAY.toDateString()) return Promise.resolve(day1Symptoms);
      return Promise.resolve(day2Symptoms);
    }),
    save: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
  };
}

function makeSettingsMock(suggestionsEnabled: boolean) {
  return {
    hasApiKey: vi.fn().mockReturnValue(false),
    getLastAnalysisDate: vi.fn().mockReturnValue(null),
    setLastAnalysisDate: vi.fn(),
    getLanguage: vi.fn().mockReturnValue('fr'),
    getDefaultContextWindow: vi.fn().mockReturnValue('14d'),
    getShowTokenCounter: vi.fn().mockReturnValue(false),
    getTheme: vi.fn().mockReturnValue('auto'),
    setTheme: vi.fn(),
    getCoachSuggestions: vi.fn().mockReturnValue(suggestionsEnabled),
    setCoachSuggestions: vi.fn(),
  };
}

describe('GetJournalSuggestionsUseCase', () => {

  describe('suggestions désactivées', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          GetJournalSuggestionsUseCase,
          { provide: STORAGE_PORT, useValue: makeStorageMock() },
          { provide: LOCAL_SETTINGS_PORT, useValue: makeSettingsMock(false) },
        ],
      });
    });

    it('retourne un tableau vide si les suggestions sont désactivées', async () => {
      const useCase = TestBed.inject(GetJournalSuggestionsUseCase);
      vi.setSystemTime(new Date('2026-06-01T10:00:00'));
      const result = await useCase.execute(TODAY, []);
      expect(result).toEqual([]);
    });
  });

  describe('pas aujourd\'hui', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          GetJournalSuggestionsUseCase,
          { provide: STORAGE_PORT, useValue: makeStorageMock() },
          { provide: LOCAL_SETTINGS_PORT, useValue: makeSettingsMock(true) },
        ],
      });
    });

    it('retourne un tableau vide si la date n\'est pas aujourd\'hui', async () => {
      const useCase = TestBed.inject(GetJournalSuggestionsUseCase);
      const yesterday = new Date('2026-05-31T00:00:00');
      const result = await useCase.execute(yesterday, []);
      expect(result).toEqual([]);
    });
  });

  describe('règle repas manquant', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          GetJournalSuggestionsUseCase,
          { provide: STORAGE_PORT, useValue: makeStorageMock() },
          { provide: LOCAL_SETTINGS_PORT, useValue: makeSettingsMock(true) },
        ],
      });
    });

    it('suggère un repas si aucun repas et heure ≥ 8h', async () => {
      const useCase = TestBed.inject(GetJournalSuggestionsUseCase);
      vi.setSystemTime(new Date('2026-06-01T10:00:00'));
      const result = await useCase.execute(TODAY, []);
      expect(result.some(s => s.type === 'no_recent_meal')).toBe(true);
    });

    it('ne suggère pas de repas si un repas est déjà saisi', async () => {
      const useCase = TestBed.inject(GetJournalSuggestionsUseCase);
      vi.setSystemTime(new Date('2026-06-01T10:00:00'));
      const result = await useCase.execute(TODAY, [mealEntry]);
      expect(result.some(s => s.type === 'no_recent_meal')).toBe(false);
    });

    it('ne suggère pas de repas avant 8h du matin', async () => {
      const useCase = TestBed.inject(GetJournalSuggestionsUseCase);
      vi.setSystemTime(new Date('2026-06-01T07:30:00'));
      const result = await useCase.execute(TODAY, []);
      expect(result.some(s => s.type === 'no_recent_meal')).toBe(false);
    });
  });

  describe('règle symptôme en hausse', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          GetJournalSuggestionsUseCase,
          {
            provide: STORAGE_PORT,
            useValue: makeStorageMock([symptomYesterday], [symptomDayBefore]),
          },
          { provide: LOCAL_SETTINGS_PORT, useValue: makeSettingsMock(true) },
        ],
      });
    });

    it('suggère le Coach si symptôme en hausse 3 jours de suite', async () => {
      const useCase = TestBed.inject(GetJournalSuggestionsUseCase);
      vi.setSystemTime(new Date('2026-06-01T10:00:00'));
      const result = await useCase.execute(TODAY, [mealEntry, symptomToday]);
      expect(result.some(s => s.type === 'symptom_trending_up')).toBe(true);
    });

    it('ne suggère pas le Coach si le symptôme ne progresse pas', async () => {
      const useCase = TestBed.inject(GetJournalSuggestionsUseCase);
      vi.setSystemTime(new Date('2026-06-01T10:00:00'));
      const stableSymptom: JournalEntry = {
        kind: 'symptom',
        data: { ...symptomToday.data, intensity: 4 },
      };
      const result = await useCase.execute(TODAY, [mealEntry, stableSymptom]);
      expect(result.some(s => s.type === 'symptom_trending_up')).toBe(false);
    });
  });
});
