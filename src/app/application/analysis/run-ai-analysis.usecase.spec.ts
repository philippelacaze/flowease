import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { RunAiAnalysisUseCase } from './run-ai-analysis.usecase';
import { ANALYSIS_PORT, STORAGE_PORT, LOCAL_SETTINGS_PORT } from '../tokens';
import { NullAIAdapter } from '../../infrastructure/ai/null/null-ai.adapter';
import type { AnalysisResult } from '../../domain/repositories/ai/analysis.port';

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

function makeStorageMock() {
  return {
    get: vi.fn().mockResolvedValue(undefined),
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

describe('RunAiAnalysisUseCase', () => {

  describe('nominal — port IA disponible', () => {
    let mockStorage: ReturnType<typeof makeStorageMock>;
    let mockSettings: ReturnType<typeof makeSettingsMock>;
    const mockAnalysisPort = { analyzeData: vi.fn() };

    beforeEach(() => {
      mockStorage = makeStorageMock();
      mockSettings = makeSettingsMock();
      vi.clearAllMocks();
      mockAnalysisPort.analyzeData.mockResolvedValue(mockAnalysisResult);

      TestBed.configureTestingModule({
        providers: [
          RunAiAnalysisUseCase,
          { provide: ANALYSIS_PORT, useValue: mockAnalysisPort },
          { provide: STORAGE_PORT, useValue: mockStorage },
          { provide: LOCAL_SETTINGS_PORT, useValue: mockSettings },
        ],
      });
    });

    it('retourne un résultat avec available: true et les insights', async () => {
      const useCase = TestBed.inject(RunAiAnalysisUseCase);
      const result = await useCase.execute(14);
      expect(result.available).toBe(true);
      expect(result.insights).toHaveLength(1);
    });

    it('transmet la fenêtre temporelle et le profil au port IA', async () => {
      const useCase = TestBed.inject(RunAiAnalysisUseCase);
      await useCase.execute(14);
      expect(mockAnalysisPort.analyzeData).toHaveBeenCalledWith(
        expect.objectContaining({ windowDays: 14 }),
      );
    });

    it('persiste le résultat dans le store insights', async () => {
      const useCase = TestBed.inject(RunAiAnalysisUseCase);
      await useCase.execute(14);
      expect(mockStorage.save).toHaveBeenCalledWith(
        'insights',
        expect.objectContaining({
          available: true,
          windowDays: 14,
        }),
      );
    });

    it('met à jour lastAnalysisDate dans les paramètres', async () => {
      const useCase = TestBed.inject(RunAiAnalysisUseCase);
      await useCase.execute(14);
      expect(mockSettings.setLastAnalysisDate).toHaveBeenCalledWith(expect.any(Date));
    });

    it('lit les données symptômes, repas et prises sur la fenêtre', async () => {
      const useCase = TestBed.inject(RunAiAnalysisUseCase);
      await useCase.execute(7);
      expect(mockStorage.getRange).toHaveBeenCalledTimes(3);
    });
  });

  describe('mode dégradé — NullAIAdapter injecté', () => {
    let mockStorage: ReturnType<typeof makeStorageMock>;
    let mockSettings: ReturnType<typeof makeSettingsMock>;

    beforeEach(() => {
      mockStorage = makeStorageMock();
      mockSettings = makeSettingsMock();

      TestBed.configureTestingModule({
        providers: [
          RunAiAnalysisUseCase,
          { provide: ANALYSIS_PORT, useClass: NullAIAdapter },
          { provide: STORAGE_PORT, useValue: mockStorage },
          { provide: LOCAL_SETTINGS_PORT, useValue: mockSettings },
        ],
      });
    });

    it('retourne available: false sans lever d\'exception', async () => {
      const useCase = TestBed.inject(RunAiAnalysisUseCase);
      const result = await useCase.execute(14);
      expect(result.available).toBe(false);
      expect(result.insights).toEqual([]);
    });

    it('persiste quand même le résultat dégradé dans insights', async () => {
      const useCase = TestBed.inject(RunAiAnalysisUseCase);
      await useCase.execute(14);
      expect(mockStorage.save).toHaveBeenCalledWith(
        'insights',
        expect.objectContaining({ available: false }),
      );
    });

    it('met à jour lastAnalysisDate même en mode dégradé', async () => {
      const useCase = TestBed.inject(RunAiAnalysisUseCase);
      await useCase.execute(14);
      expect(mockSettings.setLastAnalysisDate).toHaveBeenCalled();
    });
  });

  describe('erreur storage — getRange échoue', () => {
    const mockAnalysisPort = { analyzeData: vi.fn() };
    const storageError = new Error('IndexedDB indisponible');

    beforeEach(() => {
      const failingStorage = {
        get: vi.fn(),
        getAll: vi.fn(),
        getRange: vi.fn().mockRejectedValue(storageError),
        save: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
      };
      const mockSettings = makeSettingsMock();

      TestBed.configureTestingModule({
        providers: [
          RunAiAnalysisUseCase,
          { provide: ANALYSIS_PORT, useValue: mockAnalysisPort },
          { provide: STORAGE_PORT, useValue: failingStorage },
          { provide: LOCAL_SETTINGS_PORT, useValue: mockSettings },
        ],
      });
    });

    it('propage l\'exception storage sans la masquer', async () => {
      const useCase = TestBed.inject(RunAiAnalysisUseCase);
      await expect(useCase.execute(14)).rejects.toThrow('IndexedDB indisponible');
    });

    it('n\'appelle pas le port IA si la lecture storage échoue', async () => {
      const useCase = TestBed.inject(RunAiAnalysisUseCase);
      await expect(useCase.execute(14)).rejects.toThrow();
      expect(mockAnalysisPort.analyzeData).not.toHaveBeenCalled();
    });
  });
});
