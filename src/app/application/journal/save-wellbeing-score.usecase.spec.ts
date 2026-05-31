import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SaveWellbeingScoreUseCase } from './save-wellbeing-score.usecase';
import { STORAGE_PORT } from '../tokens';
import type { SymptomEntity } from '../../domain/entities/symptom.entity';

function makeStorage(rangeResult: SymptomEntity[] = []) {
  return {
    get: vi.fn(),
    getAll: vi.fn().mockResolvedValue([]),
    getRange: vi.fn().mockResolvedValue(rangeResult),
    save: vi.fn().mockResolvedValue('new-uuid'),
    delete: vi.fn(),
    clear: vi.fn(),
  };
}

function makeWellbeingEntry(overrides: Partial<SymptomEntity> = {}): SymptomEntity {
  return {
    id: 'existing-id',
    category: 'wellbeing',
    symptomKey: 'wellbeing_score',
    intensity: 7,
    occurredAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

const TODAY = new Date();

describe('SaveWellbeingScoreUseCase', () => {
  describe('aucune entrée existante pour le jour', () => {
    let storage: ReturnType<typeof makeStorage>;

    beforeEach(() => {
      storage = makeStorage([]);
      TestBed.configureTestingModule({
        providers: [
          SaveWellbeingScoreUseCase,
          { provide: STORAGE_PORT, useValue: storage },
        ],
      });
    });

    it('appelle storage.save une seule fois', async () => {
      const uc = TestBed.inject(SaveWellbeingScoreUseCase);
      await uc.execute({ date: TODAY, score: 8 });
      expect(storage.save).toHaveBeenCalledOnce();
    });

    it('sauvegarde avec category = wellbeing', async () => {
      const uc = TestBed.inject(SaveWellbeingScoreUseCase);
      await uc.execute({ date: TODAY, score: 8 });
      expect(storage.save).toHaveBeenCalledWith('symptoms', expect.objectContaining({ category: 'wellbeing' }));
    });

    it('sauvegarde avec symptomKey = wellbeing_score', async () => {
      const uc = TestBed.inject(SaveWellbeingScoreUseCase);
      await uc.execute({ date: TODAY, score: 8 });
      expect(storage.save).toHaveBeenCalledWith('symptoms', expect.objectContaining({ symptomKey: 'wellbeing_score' }));
    });

    it('sauvegarde avec l\'intensité passée en entrée', async () => {
      const uc = TestBed.inject(SaveWellbeingScoreUseCase);
      await uc.execute({ date: TODAY, score: 6 });
      expect(storage.save).toHaveBeenCalledWith('symptoms', expect.objectContaining({ intensity: 6 }));
    });

    it('génère un id UUID non vide', async () => {
      const uc = TestBed.inject(SaveWellbeingScoreUseCase);
      await uc.execute({ date: TODAY, score: 5 });
      const saved = (storage.save.mock.calls[0] as [string, SymptomEntity])[1];
      expect(saved.id).toBeTruthy();
    });
  });

  describe('entrée existante pour le jour', () => {
    let storage: ReturnType<typeof makeStorage>;
    const existing = makeWellbeingEntry({ id: 'existing-id', intensity: 5 });

    beforeEach(() => {
      storage = makeStorage([existing]);
      TestBed.configureTestingModule({
        providers: [
          SaveWellbeingScoreUseCase,
          { provide: STORAGE_PORT, useValue: storage },
        ],
      });
    });

    it('conserve le même id lors de la mise à jour', async () => {
      const uc = TestBed.inject(SaveWellbeingScoreUseCase);
      await uc.execute({ date: TODAY, score: 9 });
      expect(storage.save).toHaveBeenCalledWith('symptoms', expect.objectContaining({ id: 'existing-id' }));
    });

    it('met à jour l\'intensité avec la nouvelle valeur', async () => {
      const uc = TestBed.inject(SaveWellbeingScoreUseCase);
      await uc.execute({ date: TODAY, score: 9 });
      expect(storage.save).toHaveBeenCalledWith('symptoms', expect.objectContaining({ intensity: 9 }));
    });

    it('n\'appelle save qu\'une seule fois (pas de doublon)', async () => {
      const uc = TestBed.inject(SaveWellbeingScoreUseCase);
      await uc.execute({ date: TODAY, score: 9 });
      expect(storage.save).toHaveBeenCalledOnce();
    });

    it('conserve category = wellbeing lors de la mise à jour', async () => {
      const uc = TestBed.inject(SaveWellbeingScoreUseCase);
      await uc.execute({ date: TODAY, score: 9 });
      expect(storage.save).toHaveBeenCalledWith('symptoms', expect.objectContaining({ category: 'wellbeing' }));
    });
  });

  describe('filtre sur le bon jour', () => {
    let storage: ReturnType<typeof makeStorage>;

    beforeEach(() => {
      storage = makeStorage([]);
      TestBed.configureTestingModule({
        providers: [
          SaveWellbeingScoreUseCase,
          { provide: STORAGE_PORT, useValue: storage },
        ],
      });
    });

    it('appelle getRange sur le store symptoms', async () => {
      const uc = TestBed.inject(SaveWellbeingScoreUseCase);
      await uc.execute({ date: TODAY, score: 4 });
      expect(storage.getRange).toHaveBeenCalledWith('symptoms', 'occurredAt', expect.any(Date), expect.any(Date));
    });

    it('la borne basse du range est à minuit', async () => {
      const uc = TestBed.inject(SaveWellbeingScoreUseCase);
      const date = new Date('2025-06-15T14:30:00');
      await uc.execute({ date, score: 4 });
      const lower = (storage.getRange.mock.calls[0] as [string, string, Date, Date])[2];
      expect(lower.getHours()).toBe(0);
      expect(lower.getMinutes()).toBe(0);
    });

    it('la borne haute du range est à 23:59', async () => {
      const uc = TestBed.inject(SaveWellbeingScoreUseCase);
      const date = new Date('2025-06-15T14:30:00');
      await uc.execute({ date, score: 4 });
      const upper = (storage.getRange.mock.calls[0] as [string, string, Date, Date])[3];
      expect(upper.getHours()).toBe(23);
      expect(upper.getMinutes()).toBe(59);
    });
  });
});
