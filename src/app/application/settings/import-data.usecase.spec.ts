import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ImportDataUseCase, ImportValidationError } from './import-data.usecase';
import { STORAGE_PORT } from '../tokens';

const VALID_BUNDLE = JSON.stringify({
  version: 1,
  exportedAt: new Date().toISOString(),
  stores: {
    meals: [{ id: 'm1', occurredAt: new Date().toISOString(), type: 'lunch', items: [] }],
    symptoms: [{ id: 's1' }],
  },
});

function makeStorageMock(existingIds: string[] = []) {
  return {
    get: vi.fn().mockImplementation((_store: string, id: string) =>
      Promise.resolve(existingIds.includes(id) ? { id } : undefined),
    ),
    getAll: vi.fn().mockResolvedValue([]),
    getRange: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(''),
    delete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  };
}

describe('ImportDataUseCase', () => {

  describe('mode replace (défaut)', () => {
    it('efface tous les stores avant d\'importer', async () => {
      const storage = makeStorageMock();
      TestBed.configureTestingModule({
        providers: [ImportDataUseCase, { provide: STORAGE_PORT, useValue: storage }],
      });
      const useCase = TestBed.inject(ImportDataUseCase);
      await useCase.execute(VALID_BUNDLE, 'replace');
      expect(storage.clear).toHaveBeenCalledWith('meals');
      expect(storage.clear).toHaveBeenCalledWith('symptoms');
    });

    it('sauvegarde toutes les entités valides', async () => {
      const storage = makeStorageMock();
      TestBed.configureTestingModule({
        providers: [ImportDataUseCase, { provide: STORAGE_PORT, useValue: storage }],
      });
      const useCase = TestBed.inject(ImportDataUseCase);
      await useCase.execute(VALID_BUNDLE);
      expect(storage.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('mode merge', () => {
    it('ne vide pas les stores existants', async () => {
      const storage = makeStorageMock();
      TestBed.configureTestingModule({
        providers: [ImportDataUseCase, { provide: STORAGE_PORT, useValue: storage }],
      });
      const useCase = TestBed.inject(ImportDataUseCase);
      await useCase.execute(VALID_BUNDLE, 'merge');
      expect(storage.clear).not.toHaveBeenCalled();
    });

    it('insère les entités absentes', async () => {
      const storage = makeStorageMock([]);
      TestBed.configureTestingModule({
        providers: [ImportDataUseCase, { provide: STORAGE_PORT, useValue: storage }],
      });
      const useCase = TestBed.inject(ImportDataUseCase);
      await useCase.execute(VALID_BUNDLE, 'merge');
      expect(storage.save).toHaveBeenCalledTimes(2);
    });

    it('ignore les entités déjà présentes', async () => {
      const storage = makeStorageMock(['m1', 's1']);
      TestBed.configureTestingModule({
        providers: [ImportDataUseCase, { provide: STORAGE_PORT, useValue: storage }],
      });
      const useCase = TestBed.inject(ImportDataUseCase);
      await useCase.execute(VALID_BUNDLE, 'merge');
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('insère uniquement les entités absentes (partiel)', async () => {
      const storage = makeStorageMock(['m1']);
      TestBed.configureTestingModule({
        providers: [ImportDataUseCase, { provide: STORAGE_PORT, useValue: storage }],
      });
      const useCase = TestBed.inject(ImportDataUseCase);
      await useCase.execute(VALID_BUNDLE, 'merge');
      expect(storage.save).toHaveBeenCalledTimes(1);
      expect(storage.save).toHaveBeenCalledWith('symptoms', { id: 's1' });
    });
  });

  describe('validation', () => {
    it('lève ImportValidationError pour un JSON invalide', async () => {
      const storage = makeStorageMock();
      TestBed.configureTestingModule({
        providers: [ImportDataUseCase, { provide: STORAGE_PORT, useValue: storage }],
      });
      const useCase = TestBed.inject(ImportDataUseCase);
      await expect(useCase.execute('not json')).rejects.toBeInstanceOf(ImportValidationError);
    });

    it('lève ImportValidationError pour une version non supportée', async () => {
      const storage = makeStorageMock();
      TestBed.configureTestingModule({
        providers: [ImportDataUseCase, { provide: STORAGE_PORT, useValue: storage }],
      });
      const useCase = TestBed.inject(ImportDataUseCase);
      const bundle = JSON.stringify({ version: 2, stores: {} });
      await expect(useCase.execute(bundle)).rejects.toBeInstanceOf(ImportValidationError);
    });

    it('ignore les stores inconnus', async () => {
      const storage = makeStorageMock();
      TestBed.configureTestingModule({
        providers: [ImportDataUseCase, { provide: STORAGE_PORT, useValue: storage }],
      });
      const useCase = TestBed.inject(ImportDataUseCase);
      const bundle = JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
        stores: { unknown_store: [{ id: 'x1' }] },
      });
      await useCase.execute(bundle);
      expect(storage.save).not.toHaveBeenCalled();
    });
  });
});
