import { TestBed } from '@angular/core/testing';
import { StorageService } from '../../../core/services/storage.service';
import { LocalSettingsService } from '../../../core/services/local-settings.service';
import { AiService } from '../../../core/services/ai.service';
import { NullAiService } from '../../../core/services/null-ai.service';
import { vi } from 'vitest';
import { AnalysisService } from './analysis.service';
import type { AnalysisResult } from '../../../core/services/ai.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockAnalysisResult: AnalysisResult = {
  available: true,
  insights: [
    {
      type: 'correlation',
      title: 'Corrélation blé/douleurs',
      description: 'Les douleurs augmentent 2h après ingestion de blé',
      confidence: 0.82,
    },
  ],
  analyzedAt: new Date('2026-05-23T12:00:00'),
  windowDays: 14,
};

function makeStorageMock(overrides: { session?: unknown } = {}) {
  return {
    get: vi.fn().mockResolvedValue(overrides.session ?? undefined),
    getAll: vi.fn().mockResolvedValue([]),
    getRange: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue('insight-id'),
    delete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  };
}

function makeSettingsMock() {
  return {
    hasApiKey: vi.fn().mockReturnValue(false),
    getLastAnalysisDate: vi.fn().mockReturnValue(null),
    setLastAnalysisDate: vi.fn(),
  };
}

function setup(ai?: object, storageMock?: ReturnType<typeof makeStorageMock>) {
  const storage = storageMock ?? makeStorageMock();
  const settings = makeSettingsMock();
  TestBed.configureTestingModule({
    providers: [
      AnalysisService,
      { provide: StorageService, useValue: storage },
      { provide: LocalSettingsService, useValue: settings },
      ...(ai ? [{ provide: AiService, useValue: ai }] : [{ provide: AiService, useClass: NullAiService }]),
    ],
  });
  return { service: TestBed.inject(AnalysisService), storage, settings };
}

// ── run ───────────────────────────────────────────────────────────────────────

describe('AnalysisService — run', () => {
  describe('nominal — AiService disponible', () => {
    const mockAi = { analyzeData: vi.fn() };

    beforeEach(() => {
      vi.clearAllMocks();
      mockAi.analyzeData.mockResolvedValue(mockAnalysisResult);
    });

    it('retourne un résultat avec available: true et les insights', async () => {
      const { service } = setup(mockAi);
      const result = await service.run(14);
      expect(result.available).toBe(true);
      expect(result.insights).toHaveLength(1);
    });

    it('transmet la fenêtre temporelle et le profil au service IA', async () => {
      const { service } = setup(mockAi);
      await service.run(14);
      expect(mockAi.analyzeData).toHaveBeenCalledWith(
        expect.objectContaining({ windowDays: 14 }),
      );
    });

    it('persiste le résultat dans le store insights', async () => {
      const { service, storage } = setup(mockAi);
      await service.run(14);
      expect(storage.save).toHaveBeenCalledWith(
        'insights',
        expect.objectContaining({ available: true, windowDays: 14 }),
      );
    });

    it('met à jour lastAnalysisDate dans les paramètres', async () => {
      const { service, settings } = setup(mockAi);
      await service.run(14);
      expect(settings.setLastAnalysisDate).toHaveBeenCalledWith(expect.any(Date));
    });

    it('lit les données symptômes, repas et prises sur la fenêtre', async () => {
      const { service, storage } = setup(mockAi);
      await service.run(7);
      expect(storage.getRange).toHaveBeenCalledTimes(3);
    });

    it('charge toutes les cures pour la comparaison avant/pendant/après', async () => {
      const { service, storage } = setup(mockAi);
      await service.run(14);
      expect(storage.getAll).toHaveBeenCalledWith('cures');
    });

    it('transmet curesJson au service IA quand des cures existent', async () => {
      const mockCure = { id: 'cure-1', name: 'Rifaximin', status: 'active' };
      const storage = makeStorageMock();
      storage.getAll.mockResolvedValue([mockCure]);
      const { service } = setup(mockAi, storage);
      await service.run(14);
      expect(mockAi.analyzeData).toHaveBeenCalledWith(
        expect.objectContaining({ curesJson: JSON.stringify([mockCure]) }),
      );
    });

    it('omet curesJson du contexte quand aucune cure n\'existe', async () => {
      const { service } = setup(mockAi);
      await service.run(14);
      const callArg = mockAi.analyzeData.mock.calls[0][0] as Record<string, unknown>;
      expect(callArg['curesJson']).toBeUndefined();
    });
  });

  describe('mode dégradé — NullAiService injecté', () => {
    it('retourne available: false sans lever d\'exception', async () => {
      const { service } = setup();
      const result = await service.run(14);
      expect(result.available).toBe(false);
      expect(result.insights).toEqual([]);
    });

    it('persiste quand même le résultat dégradé dans insights', async () => {
      const { service, storage } = setup();
      await service.run(14);
      expect(storage.save).toHaveBeenCalledWith(
        'insights',
        expect.objectContaining({ available: false }),
      );
    });

    it('met à jour lastAnalysisDate même en mode dégradé', async () => {
      const { service, settings } = setup();
      await service.run(14);
      expect(settings.setLastAnalysisDate).toHaveBeenCalled();
    });
  });

  describe('erreur storage — getRange échoue', () => {
    const mockAi = { analyzeData: vi.fn() };
    const storageError = new Error('IndexedDB indisponible');

    beforeEach(() => {
      const failingStorage = makeStorageMock();
      failingStorage.getRange.mockRejectedValue(storageError);

      TestBed.configureTestingModule({
        providers: [
          AnalysisService,
          { provide: AiService, useValue: mockAi },
          { provide: StorageService, useValue: failingStorage },
          { provide: LocalSettingsService, useValue: makeSettingsMock() },
        ],
      });
    });

    it('propage l\'exception storage sans la masquer', async () => {
      const service = TestBed.inject(AnalysisService);
      await expect(service.run(14)).rejects.toThrow('IndexedDB indisponible');
    });

    it('n\'appelle pas le service IA si la lecture storage échoue', async () => {
      const service = TestBed.inject(AnalysisService);
      await expect(service.run(14)).rejects.toThrow();
      expect(mockAi.analyzeData).not.toHaveBeenCalled();
    });
  });
});

// ── getInsights ───────────────────────────────────────────────────────────────

describe('AnalysisService — getInsights', () => {
  it('retourne les insights triés du plus récent au plus ancien', async () => {
    const older = { id: 'a1', available: true, insights: [], analyzedAt: new Date('2026-04-01'), windowDays: 7 };
    const newer = { id: 'a2', available: true, insights: [], analyzedAt: new Date('2026-05-01'), windowDays: 14 };
    const storage = makeStorageMock();
    storage.getAll.mockResolvedValue([older, newer]);
    setup(undefined, storage);
    const service = TestBed.inject(AnalysisService);
    const results = await service.getInsights();
    expect(results[0].id).toBe('a2');
  });

  it('respecte la limite', async () => {
    const items = Array.from({ length: 15 }, (_, i) => ({
      id: `a${i}`, available: true, insights: [], analyzedAt: new Date(), windowDays: 7,
    }));
    const storage = makeStorageMock();
    storage.getAll.mockResolvedValue(items);
    setup(undefined, storage);
    const service = TestBed.inject(AnalysisService);
    const results = await service.getInsights(5);
    expect(results).toHaveLength(5);
  });
});

// ── getSymptomTrends ──────────────────────────────────────────────────────────

describe('AnalysisService — getSymptomTrends', () => {
  it('retourne un tableau vide si aucun symptôme sur la fenêtre', async () => {
    const { service } = setup();
    const trends = await service.getSymptomTrends(7);
    expect(trends).toEqual([]);
  });

  it('filtre par symptomKey si fourni', async () => {
    const storage = makeStorageMock();
    storage.getRange.mockResolvedValue([
      { id: 's1', symptomKey: 'abdominal_pain', intensity: 5, occurredAt: new Date('2026-05-01'), createdAt: new Date(), category: 'digestive' },
      { id: 's2', symptomKey: 'bloating', intensity: 3, occurredAt: new Date('2026-05-01'), createdAt: new Date(), category: 'digestive' },
    ]);
    setup(undefined, storage);
    const service = TestBed.inject(AnalysisService);
    const trends = await service.getSymptomTrends(7, 'abdominal_pain');
    expect(trends.every(t => t.symptomKey === 'abdominal_pain')).toBe(true);
  });

  it('agrège les saisies du même jour', async () => {
    const storage = makeStorageMock();
    storage.getRange.mockResolvedValue([
      { id: 's1', symptomKey: 'abdominal_pain', intensity: 4, occurredAt: new Date('2026-05-01T08:00:00'), createdAt: new Date(), category: 'digestive' },
      { id: 's2', symptomKey: 'abdominal_pain', intensity: 6, occurredAt: new Date('2026-05-01T20:00:00'), createdAt: new Date(), category: 'digestive' },
    ]);
    setup(undefined, storage);
    const service = TestBed.inject(AnalysisService);
    const trends = await service.getSymptomTrends(7, 'abdominal_pain');
    expect(trends).toHaveLength(1);
    expect(trends[0].averageIntensity).toBe(5);
    expect(trends[0].count).toBe(2);
  });
});

// ── getAdherenceStats ─────────────────────────────────────────────────────────

describe('AnalysisService — getAdherenceStats', () => {
  it('retourne un tableau vide si aucun traitement actif', async () => {
    const storage = makeStorageMock();
    storage.getAll.mockResolvedValue([{ id: 't1', name: 'Probio', active: false, frequency: 2 }]);
    setup(undefined, storage);
    const service = TestBed.inject(AnalysisService);
    const stats = await service.getAdherenceStats(7);
    expect(stats).toEqual([]);
  });

  it('calcule le taux d\'observance correctement', async () => {
    const storage = makeStorageMock();
    storage.getAll.mockResolvedValue([
      { id: 't1', name: 'Rifaximin', active: true, frequency: 3 },
    ]);
    storage.getRange.mockResolvedValue([
      { treatmentId: 't1', status: 'taken', occurredAt: new Date() },
      { treatmentId: 't1', status: 'taken', occurredAt: new Date() },
    ]);
    setup(undefined, storage);
    const service = TestBed.inject(AnalysisService);
    const stats = await service.getAdherenceStats(1);
    expect(stats[0].takenCount).toBe(2);
    expect(stats[0].expectedCount).toBe(3);
    expect(stats[0].adherenceRate).toBeCloseTo(2 / 3);
  });
});
