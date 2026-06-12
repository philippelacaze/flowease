import { TestBed } from '@angular/core/testing';
import { StorageService } from '../../../core/services/storage.service';
import { AiService } from '../../../core/services/ai.service';
import { NullAiService } from '../../../core/services/null-ai.service';
import { vi } from 'vitest';
import { SettingsService, ImportValidationError } from './settings.service';
import type { CreateCureInput } from './settings.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeStorage(existingIds: string[] = []) {
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

function setup(options: {
  storage?: ReturnType<typeof makeStorage>;
  ai?: object;
} = {}) {
  const storage = options.storage ?? makeStorage();
  TestBed.configureTestingModule({
    providers: [
      SettingsService,
      { provide: StorageService, useValue: storage },
      options.ai
        ? { provide: AiService, useValue: options.ai }
        : { provide: AiService, useClass: NullAiService },
    ],
  });
  return { service: TestBed.inject(SettingsService), storage };
}

const VALID_BUNDLE = JSON.stringify({
  version: 1,
  exportedAt: new Date().toISOString(),
  stores: {
    meals: [{ id: 'm1', occurredAt: new Date().toISOString(), type: 'lunch', items: [] }],
    symptoms: [{ id: 's1' }],
  },
});

// ── saveProfile ───────────────────────────────────────────────────────────────

describe('SettingsService — saveProfile', () => {
  it('persiste le profil avec id singleton et updatedAt', async () => {
    const { service, storage } = setup();
    await service.saveProfile({
      conditions: ['sibo_hydrogen'],
      protocol: 'strict',
      language: 'fr',
      theme: 'auto',
      showTokenCounter: false,
      defaultCoachContext: '14d',
      updatedAt: new Date(),
    } as never);
    expect(storage.save).toHaveBeenCalledWith(
      'user-profile',
      expect.objectContaining({ id: 'singleton', conditions: ['sibo_hydrogen'] }),
    );
  });
});

// ── getCures ──────────────────────────────────────────────────────────────────

describe('SettingsService — getCures', () => {
  it('retourne les cures triées par date décroissante', async () => {
    const older = { id: 'c1', name: 'Cure A', startedAt: new Date('2026-04-01') };
    const newer = { id: 'c2', name: 'Cure B', startedAt: new Date('2026-05-01') };
    const storage = makeStorage();
    storage.getAll.mockResolvedValue([older, newer]);
    setup({ storage });
    const service = TestBed.inject(SettingsService);
    const cures = await service.getCures();
    expect(cures[0].id).toBe('c2');
    expect(cures[1].id).toBe('c1');
  });

  it('retourne un tableau vide si aucune cure', async () => {
    const { service } = setup();
    const cures = await service.getCures();
    expect(cures).toEqual([]);
  });
});

// ── createCure ────────────────────────────────────────────────────────────────

describe('SettingsService — createCure', () => {
  const input: CreateCureInput = {
    name: 'Rifaximin',
    treatmentIds: ['t1'],
    durationDays: 14,
    startedAt: new Date('2026-05-01'),
    notes: 'notes cure',
  };

  it('crée une cure avec status active et un UUID', async () => {
    const { service, storage } = setup();
    const cure = await service.createCure(input);
    expect(cure.status).toBe('active');
    expect(cure.id).toBeDefined();
    expect(storage.save).toHaveBeenCalledWith('cures', expect.objectContaining({ name: 'Rifaximin' }));
  });
});

// ── importData ────────────────────────────────────────────────────────────────

describe('SettingsService — importData', () => {
  describe('mode replace (défaut)', () => {
    it('efface tous les stores avant d\'importer', async () => {
      const storage = makeStorage();
      setup({ storage });
      const service = TestBed.inject(SettingsService);
      await service.importData(VALID_BUNDLE, 'replace');
      expect(storage.clear).toHaveBeenCalledWith('meals');
      expect(storage.clear).toHaveBeenCalledWith('symptoms');
    });

    it('sauvegarde toutes les entités valides', async () => {
      const storage = makeStorage();
      setup({ storage });
      const service = TestBed.inject(SettingsService);
      await service.importData(VALID_BUNDLE);
      expect(storage.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('mode merge', () => {
    it('ne vide pas les stores existants', async () => {
      const storage = makeStorage();
      setup({ storage });
      const service = TestBed.inject(SettingsService);
      await service.importData(VALID_BUNDLE, 'merge');
      expect(storage.clear).not.toHaveBeenCalled();
    });

    it('insère les entités absentes', async () => {
      const storage = makeStorage([]);
      setup({ storage });
      const service = TestBed.inject(SettingsService);
      await service.importData(VALID_BUNDLE, 'merge');
      expect(storage.save).toHaveBeenCalledTimes(2);
    });

    it('ignore les entités déjà présentes', async () => {
      const storage = makeStorage(['m1', 's1']);
      setup({ storage });
      const service = TestBed.inject(SettingsService);
      await service.importData(VALID_BUNDLE, 'merge');
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('insère uniquement les entités absentes (partiel)', async () => {
      const storage = makeStorage(['m1']);
      setup({ storage });
      const service = TestBed.inject(SettingsService);
      await service.importData(VALID_BUNDLE, 'merge');
      expect(storage.save).toHaveBeenCalledTimes(1);
      expect(storage.save).toHaveBeenCalledWith('symptoms', { id: 's1' });
    });
  });

  describe('validation', () => {
    it('lève ImportValidationError pour un JSON invalide', async () => {
      const { service } = setup();
      await expect(service.importData('not json')).rejects.toBeInstanceOf(ImportValidationError);
    });

    it('lève ImportValidationError pour une version non supportée', async () => {
      const { service } = setup();
      await expect(service.importData(JSON.stringify({ version: 2, stores: {} }))).rejects.toBeInstanceOf(ImportValidationError);
    });

    it('ignore les stores inconnus', async () => {
      const storage = makeStorage();
      setup({ storage });
      const service = TestBed.inject(SettingsService);
      const bundle = JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
        stores: { unknown_store: [{ id: 'x1' }] },
      });
      await service.importData(bundle);
      expect(storage.save).not.toHaveBeenCalled();
    });
  });
});

// ── testApiKey ────────────────────────────────────────────────────────────────

describe('SettingsService — testApiKey', () => {
  it('retourne ok: false si la clé est vide', async () => {
    const { service } = setup();
    const result = await service.testApiKey('');
    expect(result.ok).toBe(false);
    expect(result.errorMessage).toBe('Clé vide');
  });

  it('retourne ok: true quand testApiKey retourne null', async () => {
    const mockAi = { testApiKey: vi.fn().mockResolvedValue(null) };
    setup({ ai: mockAi });
    const service = TestBed.inject(SettingsService);
    const result = await service.testApiKey('sk-valid');
    expect(result.ok).toBe(true);
  });

  it('retourne ok: false avec le message d\'erreur quand testApiKey échoue', async () => {
    const mockAi = { testApiKey: vi.fn().mockResolvedValue('Clé invalide') };
    setup({ ai: mockAi });
    const service = TestBed.inject(SettingsService);
    const result = await service.testApiKey('sk-invalid');
    expect(result.ok).toBe(false);
    expect(result.errorMessage).toBe('Clé invalide');
  });

  it('mode dégradé NullAiService — retourne ok: false sans exception', async () => {
    const { service } = setup();
    const result = await service.testApiKey('sk-test');
    expect(result.ok).toBe(false);
  });
});
