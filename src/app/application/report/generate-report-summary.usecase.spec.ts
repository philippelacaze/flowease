import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { GenerateReportSummaryUseCase } from './generate-report-summary.usecase';
import { REPORT_PORT, STORAGE_PORT } from '../tokens';
import { NullAIAdapter } from '../../infrastructure/ai/null/null-ai.adapter';
import type { ReportData } from '../../domain/repositories/ai/report.port';
import type { ReportEntity } from '../../domain/entities/report.entity';

const mockReportData: ReportData = {
  sections: [
    { key: 'meals', title: 'Alimentation', content: 'Repas normaux', included: true },
    { key: 'symptoms', title: 'Symptômes', content: 'Douleurs modérées', included: true },
  ],
  windowDays: 14,
  userConditions: ['sibo_hydrogen'],
};

const mockReport: ReportEntity = {
  id: 'report-test-123',
  windowDays: 14,
  startDate: new Date('2026-05-09'),
  endDate: new Date('2026-05-23'),
  format: 'text',
  sections: mockReportData.sections,
  generatedAt: new Date('2026-05-23T10:00:00'),
};

const mockSummary = '## Synthèse médicale\n\nSIBO hydrogène modéré observé...';

function makeStorageMock(reportToReturn: ReportEntity | undefined = mockReport) {
  return {
    get: vi.fn().mockResolvedValue(reportToReturn),
    getAll: vi.fn().mockResolvedValue([]),
    getRange: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(mockReport.id),
    delete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  };
}

describe('GenerateReportSummaryUseCase', () => {

  describe('nominal — port IA disponible', () => {
    let mockStorage: ReturnType<typeof makeStorageMock>;
    const mockReportPort = { generateReportSummary: vi.fn() };

    beforeEach(() => {
      mockStorage = makeStorageMock();
      vi.clearAllMocks();
      mockReportPort.generateReportSummary.mockResolvedValue(mockSummary);

      TestBed.configureTestingModule({
        providers: [
          GenerateReportSummaryUseCase,
          { provide: REPORT_PORT, useValue: mockReportPort },
          { provide: STORAGE_PORT, useValue: mockStorage },
        ],
      });
    });

    it('retourne la synthèse générée par le port IA', async () => {
      const useCase = TestBed.inject(GenerateReportSummaryUseCase);
      const result = await useCase.execute(mockReport.id, mockReportData);
      expect(result).toBe(mockSummary);
    });

    it('transmet les données du rapport au port IA', async () => {
      const useCase = TestBed.inject(GenerateReportSummaryUseCase);
      await useCase.execute(mockReport.id, mockReportData);
      expect(mockReportPort.generateReportSummary).toHaveBeenCalledWith(mockReportData);
    });

    it('persiste la synthèse dans le rapport existant', async () => {
      const useCase = TestBed.inject(GenerateReportSummaryUseCase);
      await useCase.execute(mockReport.id, mockReportData);
      expect(mockStorage.save).toHaveBeenCalledWith(
        'reports',
        expect.objectContaining({
          id: mockReport.id,
          aiSummary: mockSummary,
        }),
      );
    });

    it('retourne la synthèse même si le rapport est introuvable en storage', async () => {
      mockStorage.get.mockResolvedValue(undefined);
      const useCase = TestBed.inject(GenerateReportSummaryUseCase);
      const result = await useCase.execute('id-inexistant', mockReportData);
      expect(result).toBe(mockSummary);
      expect(mockStorage.save).not.toHaveBeenCalled();
    });
  });

  describe('mode dégradé — NullAIAdapter injecté', () => {
    let mockStorage: ReturnType<typeof makeStorageMock>;

    beforeEach(() => {
      mockStorage = makeStorageMock();

      TestBed.configureTestingModule({
        providers: [
          GenerateReportSummaryUseCase,
          { provide: REPORT_PORT, useClass: NullAIAdapter },
          { provide: STORAGE_PORT, useValue: mockStorage },
        ],
      });
    });

    it('retourne null sans lever d\'exception', async () => {
      const useCase = TestBed.inject(GenerateReportSummaryUseCase);
      const result = await useCase.execute(mockReport.id, mockReportData);
      expect(result).toBeNull();
    });

    it('ne met pas à jour le rapport quand l\'IA est indisponible', async () => {
      const useCase = TestBed.inject(GenerateReportSummaryUseCase);
      await useCase.execute(mockReport.id, mockReportData);
      expect(mockStorage.save).not.toHaveBeenCalled();
    });
  });

  describe('erreur storage — la lecture du rapport échoue', () => {
    const mockReportPort = { generateReportSummary: vi.fn() };
    const storageError = new Error('IndexedDB indisponible');

    beforeEach(() => {
      mockReportPort.generateReportSummary.mockResolvedValue(mockSummary);
      const failingStorage = {
        get: vi.fn().mockRejectedValue(storageError),
        getAll: vi.fn(),
        getRange: vi.fn(),
        save: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
      };

      TestBed.configureTestingModule({
        providers: [
          GenerateReportSummaryUseCase,
          { provide: REPORT_PORT, useValue: mockReportPort },
          { provide: STORAGE_PORT, useValue: failingStorage },
        ],
      });
    });

    it('propage l\'exception storage sans la masquer', async () => {
      const useCase = TestBed.inject(GenerateReportSummaryUseCase);
      await expect(useCase.execute(mockReport.id, mockReportData)).rejects.toThrow(
        'IndexedDB indisponible',
      );
    });
  });
});
