import { TestBed } from '@angular/core/testing';
import { StorageService } from '../../../core/services/storage.service';
import { AiService } from '../../../core/services/ai.service';
import { NullAiService } from '../../../core/services/null-ai.service';
import { vi } from 'vitest';
import { ReportService } from './report.service';
import type { BuildReportInput } from './report.service';
import type { ReportData } from '../../../core/services/ai.service';
import type { ReportEntity } from '../../../core/models/entities/report.entity';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockInput: BuildReportInput = {
  windowDays: 14,
  startDate: new Date('2026-05-09'),
  endDate: new Date('2026-05-23'),
  format: 'text',
};

const mockReportData: ReportData = {
  sections: [
    { key: 'meals', title: 'Alimentation', content: 'Repas normaux', included: true },
    { key: 'symptoms', title: 'Symptômes', content: 'Douleurs modérées', included: true },
  ],
  windowDays: 14,
  userConditions: ['sibo_hydrogen'],
};

const mockSummary = '## Synthèse médicale\n\nSIBO hydrogène modéré observé...';

function makeStorageMock(reportToReturn?: ReportEntity) {
  return {
    get: vi.fn().mockResolvedValue(reportToReturn),
    getAll: vi.fn().mockResolvedValue([]),
    getRange: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue('report-id'),
    delete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  };
}

function setup(ai?: object, storageMock?: ReturnType<typeof makeStorageMock>) {
  const storage = storageMock ?? makeStorageMock();
  TestBed.configureTestingModule({
    providers: [
      ReportService,
      { provide: StorageService, useValue: storage },
      ...(ai ? [{ provide: AiService, useValue: ai }] : [{ provide: AiService, useClass: NullAiService }]),
    ],
  });
  return { service: TestBed.inject(ReportService), storage };
}

// ── build ─────────────────────────────────────────────────────────────────────

describe('ReportService — build', () => {
  it('retourne une ReportEntity avec les 5 sections', async () => {
    const { service } = setup();
    const report = await service.build(mockInput);
    expect(report.sections).toHaveLength(5);
    expect(report.windowDays).toBe(14);
    expect(report.format).toBe('text');
  });

  it('persiste le rapport dans le store reports', async () => {
    const { service, storage } = setup();
    const report = await service.build(mockInput);
    expect(storage.save).toHaveBeenCalledWith('reports', expect.objectContaining({ id: report.id }));
  });

  it('charge les données sur la fenêtre temporelle', async () => {
    const { service, storage } = setup();
    await service.build(mockInput);
    expect(storage.getRange).toHaveBeenCalledTimes(4); // meals, symptoms, intakes, notes
    expect(storage.getAll).toHaveBeenCalledWith('treatments');
  });

  it('respecte les sections incluses si spécifiées', async () => {
    const { service } = setup();
    const report = await service.build({ ...mockInput, includedSections: ['meals', 'symptoms'] });
    const mealsSection = report.sections.find(s => s.key === 'meals');
    const adherenceSection = report.sections.find(s => s.key === 'adherence');
    expect(mealsSection?.included).toBe(true);
    expect(adherenceSection?.included).toBe(false);
  });
});

// ── generateSummary ───────────────────────────────────────────────────────────

describe('ReportService — generateSummary', () => {
  describe('nominal — AiService disponible', () => {
    const mockAi = { generateReportSummary: vi.fn() };

    beforeEach(() => {
      vi.clearAllMocks();
      mockAi.generateReportSummary.mockResolvedValue(mockSummary);
    });

    it('retourne la synthèse générée par le service IA', async () => {
      const report: ReportEntity = { id: 'r1', ...mockInput, sections: [], generatedAt: new Date() };
      const storage = makeStorageMock(report);
      setup(mockAi, storage);
      const service = TestBed.inject(ReportService);
      const result = await service.generateSummary('r1', mockReportData);
      expect(result).toBe(mockSummary);
    });

    it('transmet les données du rapport au service IA', async () => {
      const report: ReportEntity = { id: 'r1', ...mockInput, sections: [], generatedAt: new Date() };
      const storage = makeStorageMock(report);
      setup(mockAi, storage);
      const service = TestBed.inject(ReportService);
      await service.generateSummary('r1', mockReportData);
      expect(mockAi.generateReportSummary).toHaveBeenCalledWith(mockReportData);
    });

    it('persiste la synthèse dans le rapport existant', async () => {
      const report: ReportEntity = { id: 'r1', ...mockInput, sections: [], generatedAt: new Date() };
      const storage = makeStorageMock(report);
      setup(mockAi, storage);
      const service = TestBed.inject(ReportService);
      await service.generateSummary('r1', mockReportData);
      expect(storage.save).toHaveBeenCalledWith(
        'reports',
        expect.objectContaining({ id: 'r1', aiSummary: mockSummary }),
      );
    });

    it('retourne la synthèse même si le rapport est introuvable en storage', async () => {
      const storage = makeStorageMock(undefined);
      setup(mockAi, storage);
      const service = TestBed.inject(ReportService);
      const result = await service.generateSummary('id-inexistant', mockReportData);
      expect(result).toBe(mockSummary);
      expect(storage.save).not.toHaveBeenCalled();
    });
  });

  describe('mode dégradé — NullAiService injecté', () => {
    it('retourne null sans lever d\'exception', async () => {
      const { service } = setup();
      const result = await service.generateSummary('r1', mockReportData);
      expect(result).toBeNull();
    });

    it('ne met pas à jour le rapport quand l\'IA est indisponible', async () => {
      const { service, storage } = setup();
      await service.generateSummary('r1', mockReportData);
      expect(storage.save).not.toHaveBeenCalled();
    });
  });

  describe('erreur storage', () => {
    const mockAi = { generateReportSummary: vi.fn() };
    const storageError = new Error('IndexedDB indisponible');

    beforeEach(() => {
      mockAi.generateReportSummary.mockResolvedValue(mockSummary);
      const failingStorage = makeStorageMock();
      failingStorage.get.mockRejectedValue(storageError);

      TestBed.configureTestingModule({
        providers: [
          ReportService,
          { provide: AiService, useValue: mockAi },
          { provide: StorageService, useValue: failingStorage },
        ],
      });
    });

    it('propage l\'exception storage sans la masquer', async () => {
      const service = TestBed.inject(ReportService);
      await expect(service.generateSummary('r1', mockReportData)).rejects.toThrow('IndexedDB indisponible');
    });
  });
});
