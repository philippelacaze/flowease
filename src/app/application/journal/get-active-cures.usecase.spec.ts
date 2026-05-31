import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { GetActiveCuresUseCase } from './get-active-cures.usecase';
import { STORAGE_PORT } from '../tokens';
import type { CureEntity } from '../../domain/entities/cure.entity';

function makeStorage(stored: unknown[]) {
  return {
    get: vi.fn(),
    getAll: vi.fn().mockResolvedValue(stored),
    getRange: vi.fn(),
    save: vi.fn().mockResolvedValue('id'),
    delete: vi.fn(),
    clear: vi.fn(),
  };
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function makeCure(overrides: Partial<CureEntity> = {}): CureEntity {
  return {
    id: 'cure-1',
    name: 'Rifaximine',
    treatmentIds: [],
    status: 'active',
    durationDays: 14,
    startedAt: daysAgo(0),
    notes: '',
    createdAt: daysAgo(0),
    ...overrides,
  };
}

describe('GetActiveCuresUseCase', () => {
  describe('aucune cure en base', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          GetActiveCuresUseCase,
          { provide: STORAGE_PORT, useValue: makeStorage([]) },
        ],
      });
    });

    it('retourne un tableau vide', async () => {
      const uc = TestBed.inject(GetActiveCuresUseCase);
      expect(await uc.execute()).toEqual([]);
    });
  });

  describe('cure dont le statut n\'est pas active', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          GetActiveCuresUseCase,
          { provide: STORAGE_PORT, useValue: makeStorage([makeCure({ status: 'completed' })]) },
        ],
      });
    });

    it('ne retourne pas la cure', async () => {
      const uc = TestBed.inject(GetActiveCuresUseCase);
      expect(await uc.execute()).toEqual([]);
    });
  });

  describe('cure active démarrée aujourd\'hui (jour 1)', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          GetActiveCuresUseCase,
          { provide: STORAGE_PORT, useValue: makeStorage([makeCure({ startedAt: daysAgo(0), durationDays: 14 })]) },
        ],
      });
    });

    it('retourne currentDay = 1', async () => {
      const uc = TestBed.inject(GetActiveCuresUseCase);
      const [progress] = await uc.execute();
      expect(progress.currentDay).toBe(1);
    });

    it('retourne totalDays = 14', async () => {
      const uc = TestBed.inject(GetActiveCuresUseCase);
      const [progress] = await uc.execute();
      expect(progress.totalDays).toBe(14);
    });

    it('retourne progressPercent = 7 (1/14 arrondi)', async () => {
      const uc = TestBed.inject(GetActiveCuresUseCase);
      const [progress] = await uc.execute();
      expect(progress.progressPercent).toBe(7);
    });

    it('retourne le nom de la cure', async () => {
      const uc = TestBed.inject(GetActiveCuresUseCase);
      const [progress] = await uc.execute();
      expect(progress.name).toBe('Rifaximine');
    });
  });

  describe('cure active à mi-parcours (jour 8/14)', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          GetActiveCuresUseCase,
          { provide: STORAGE_PORT, useValue: makeStorage([makeCure({ startedAt: daysAgo(7), durationDays: 14 })]) },
        ],
      });
    });

    it('retourne currentDay = 8', async () => {
      const uc = TestBed.inject(GetActiveCuresUseCase);
      const [progress] = await uc.execute();
      expect(progress.currentDay).toBe(8);
    });

    it('retourne progressPercent = 57 (8/14 arrondi)', async () => {
      const uc = TestBed.inject(GetActiveCuresUseCase);
      const [progress] = await uc.execute();
      expect(progress.progressPercent).toBe(57);
    });
  });

  describe('cure dont la durée est dépassée (auto-clôture)', () => {
    let storage: ReturnType<typeof makeStorage>;

    beforeEach(() => {
      storage = makeStorage([makeCure({ startedAt: daysAgo(14), durationDays: 14 })]);
      TestBed.configureTestingModule({
        providers: [
          GetActiveCuresUseCase,
          { provide: STORAGE_PORT, useValue: storage },
        ],
      });
    });

    it('ne retourne pas la cure dans les résultats', async () => {
      const uc = TestBed.inject(GetActiveCuresUseCase);
      expect(await uc.execute()).toEqual([]);
    });

    it('appelle storage.save avec status = completed', async () => {
      const uc = TestBed.inject(GetActiveCuresUseCase);
      await uc.execute();
      expect(storage.save).toHaveBeenCalledWith('cures', expect.objectContaining({ status: 'completed' }));
    });

    it('appelle storage.save avec endedAt défini', async () => {
      const uc = TestBed.inject(GetActiveCuresUseCase);
      await uc.execute();
      expect(storage.save).toHaveBeenCalledWith('cures', expect.objectContaining({ endedAt: expect.any(Date) }));
    });
  });

  describe('cure active dont startedAt est dans le futur', () => {
    beforeEach(() => {
      const future = new Date();
      future.setDate(future.getDate() + 1);
      future.setHours(0, 0, 0, 0);
      TestBed.configureTestingModule({
        providers: [
          GetActiveCuresUseCase,
          { provide: STORAGE_PORT, useValue: makeStorage([makeCure({ startedAt: future })]) },
        ],
      });
    });

    it('ignore la cure pas encore démarrée', async () => {
      const uc = TestBed.inject(GetActiveCuresUseCase);
      expect(await uc.execute()).toEqual([]);
    });
  });

  describe('plusieurs cures actives', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          GetActiveCuresUseCase,
          {
            provide: STORAGE_PORT,
            useValue: makeStorage([
              makeCure({ id: 'c1', name: 'Rifaximine', startedAt: daysAgo(3), durationDays: 14 }),
              makeCure({ id: 'c2', name: 'Probiotic', startedAt: daysAgo(0), durationDays: 30 }),
            ]),
          },
        ],
      });
    });

    it('retourne les deux cures', async () => {
      const uc = TestBed.inject(GetActiveCuresUseCase);
      const result = await uc.execute();
      expect(result).toHaveLength(2);
    });

    it('chaque cure a le bon id', async () => {
      const uc = TestBed.inject(GetActiveCuresUseCase);
      const result = await uc.execute();
      const ids = result.map(c => c.id);
      expect(ids).toContain('c1');
      expect(ids).toContain('c2');
    });
  });
});
