import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { GetActiveSymptomsUseCase } from './get-active-symptoms.usecase';
import { STORAGE_PORT } from '../tokens';

function makeStorage(stored: unknown[]) {
  return {
    get: vi.fn(),
    getAll: vi.fn().mockResolvedValue(stored),
    getRange: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
  };
}

describe('GetActiveSymptomsUseCase', () => {

  describe('aucune configuration enregistrée', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          GetActiveSymptomsUseCase,
          { provide: STORAGE_PORT, useValue: makeStorage([]) },
        ],
      });
    });

    it('retourne la liste par défaut complète', async () => {
      const uc = TestBed.inject(GetActiveSymptomsUseCase);
      const result = await uc.execute();
      expect(result.length).toBeGreaterThan(0);
    });

    it('tous les symptômes par défaut ont un key et un label', async () => {
      const uc = TestBed.inject(GetActiveSymptomsUseCase);
      const result = await uc.execute();
      for (const s of result) {
        expect(s.key).toBeTruthy();
        expect(s.label).toBeTruthy();
      }
    });
  });

  describe('configuration avec des symptômes actifs et inactifs', () => {
    const stored = [
      { id: 'bloating',   key: 'bloating',   label: 'Ballonnements', order: 0, active: true,  custom: false },
      { id: 'nausea',     key: 'nausea',     label: 'Nausées',       order: 1, active: false, custom: false },
      { id: 'fatigue',    key: 'fatigue',     label: 'Fatigue',       order: 2, active: true,  custom: false },
    ];

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          GetActiveSymptomsUseCase,
          { provide: STORAGE_PORT, useValue: makeStorage(stored) },
        ],
      });
    });

    it('n\'inclut que les symptômes actifs', async () => {
      const uc = TestBed.inject(GetActiveSymptomsUseCase);
      const result = await uc.execute();
      expect(result).toHaveLength(2);
      expect(result.map(s => s.key)).not.toContain('nausea');
    });

    it('trie les symptômes par order croissant', async () => {
      const uc = TestBed.inject(GetActiveSymptomsUseCase);
      const result = await uc.execute();
      const orders = result.map(s => s.order);
      expect(orders).toEqual([...orders].sort((a, b) => a - b));
    });

    it('n\'expose pas la propriété active dans le résultat', async () => {
      const uc = TestBed.inject(GetActiveSymptomsUseCase);
      const result = await uc.execute();
      for (const s of result) {
        expect(s).not.toHaveProperty('active');
      }
    });
  });

  describe('configuration avec un symptôme personnalisé actif', () => {
    const stored = [
      { id: 'abc-123', key: 'mon_symptome', label: 'Mon symptôme', order: 0, active: true, custom: true },
    ];

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          GetActiveSymptomsUseCase,
          { provide: STORAGE_PORT, useValue: makeStorage(stored) },
        ],
      });
    });

    it('inclut les symptômes personnalisés actifs', async () => {
      const uc = TestBed.inject(GetActiveSymptomsUseCase);
      const result = await uc.execute();
      expect(result).toHaveLength(1);
      expect(result[0].custom).toBe(true);
      expect(result[0].key).toBe('mon_symptome');
    });
  });

  describe('tous les symptômes désactivés', () => {
    const stored = [
      { id: 'bloating', key: 'bloating', label: 'Ballonnements', order: 0, active: false, custom: false },
    ];

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          GetActiveSymptomsUseCase,
          { provide: STORAGE_PORT, useValue: makeStorage(stored) },
        ],
      });
    });

    it('retourne un tableau vide si tous sont désactivés', async () => {
      const uc = TestBed.inject(GetActiveSymptomsUseCase);
      const result = await uc.execute();
      expect(result).toEqual([]);
    });
  });
});
