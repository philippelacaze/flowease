import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { jsPDF } from 'jspdf';
import { PdfReportService } from './pdf-report.service';
import type { ReportEntity } from '../models/entities/report.entity';

function createMockDoc() {
  return {
    setFont:          vi.fn().mockReturnThis(),
    setFontSize:      vi.fn().mockReturnThis(),
    setTextColor:     vi.fn().mockReturnThis(),
    text:             vi.fn().mockReturnThis(),
    setDrawColor:     vi.fn().mockReturnThis(),
    setLineWidth:     vi.fn().mockReturnThis(),
    line:             vi.fn().mockReturnThis(),
    splitTextToSize:  vi.fn().mockImplementation((t: string) => [t]),
    addPage:          vi.fn().mockReturnThis(),
    getNumberOfPages: vi.fn().mockReturnValue(1),
    setPage:          vi.fn().mockReturnThis(),
    save:             vi.fn(),
  };
}

type MockDoc = ReturnType<typeof createMockDoc>;

/**
 * Sous-classe testable : injecte un doc mock et intercepte save()
 * sans déclencher de téléchargement navigateur.
 */
class TestablePdfReportService extends PdfReportService {
  mockDoc!: MockDoc;
  savedFilename: string | null = null;

  protected override createDoc(): jsPDF {
    return this.mockDoc as unknown as jsPDF;
  }

  protected override save(_doc: jsPDF, filename: string): void {
    this.savedFilename = filename;
  }
}

const mockReport: ReportEntity = {
  id: 'report-1',
  windowDays: 14,
  startDate: new Date('2026-05-18'),
  endDate: new Date('2026-06-01'),
  format: 'pdf',
  generatedAt: new Date('2026-06-01T10:00:00'),
  sections: [
    { key: 'meals',    title: 'Alimentation', content: 'Bonne observance alimentaire.', included: true  },
    { key: 'symptoms', title: 'Symptômes',    content: 'Ballonnements modérés notés.', included: true  },
    { key: 'notes',    title: 'Notes',        content: 'Aucune note.',                 included: false },
  ],
};

describe('PdfReportService', () => {
  let service: TestablePdfReportService;
  let mockDoc: MockDoc;

  beforeEach(() => {
    mockDoc = createMockDoc();

    TestBed.configureTestingModule({
      providers: [{ provide: PdfReportService, useClass: TestablePdfReportService }],
    });
    service = TestBed.inject(PdfReportService) as TestablePdfReportService;
    service.mockDoc = mockDoc;
  });

  it('ne lève pas d\'exception pour un rapport valide sans synthèse IA', () => {
    expect(() => service.generate(mockReport, null)).not.toThrow();
  });

  it('ne lève pas d\'exception avec une synthèse IA fournie', () => {
    expect(() => service.generate(mockReport, 'Synthèse IA de test')).not.toThrow();
  });

  it('appelle doc.save() pour déclencher le téléchargement', () => {
    service.generate(mockReport, null);
    expect(service.savedFilename).not.toBeNull();
  });

  it('utilise le nom de fichier FlowEase_rapport_YYYY-MM-DD.pdf', () => {
    service.generate(mockReport, null);
    expect(service.savedFilename).toMatch(/^FlowEase_rapport_\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  it('écrit le texte "FlowEase" dans le PDF', () => {
    service.generate(mockReport, null);
    const texts = mockDoc.text.mock.calls.map((c: unknown[]) => c[0]);
    expect(texts).toContain('FlowEase');
  });

  it('inclut les titres des sections incluses', () => {
    service.generate(mockReport, null);
    const texts = mockDoc.text.mock.calls.map((c: unknown[]) => String(c[0]).toUpperCase());
    expect(texts.some((t: string) => t.includes('ALIMENTATION'))).toBe(true);
    expect(texts.some((t: string) => t.includes('SYMPTÔMES'))).toBe(true);
  });

  it('ignore les sections dont included === false', () => {
    service.generate(mockReport, null);
    const texts = mockDoc.text.mock.calls.map((c: unknown[]) => String(c[0]).toUpperCase());
    expect(texts.some((t: string) => t.includes('NOTES'))).toBe(false);
  });

  it('inclut le titre de synthèse IA quand elle est fournie', () => {
    service.generate(mockReport, 'Ma synthèse IA');
    const texts = mockDoc.text.mock.calls.map((c: unknown[]) => String(c[0]).toUpperCase());
    expect(texts.some((t: string) => t.includes('SYNTHÈSE IA'))).toBe(true);
  });

  it('n\'inclut pas de section synthèse IA quand elle est null', () => {
    service.generate(mockReport, null);
    const texts = mockDoc.text.mock.calls.map((c: unknown[]) => String(c[0]).toUpperCase());
    expect(texts.some((t: string) => t.includes('SYNTHÈSE IA'))).toBe(false);
  });

  it('gère un rapport sans sections incluses sans lever d\'exception', () => {
    const emptyReport: ReportEntity = {
      ...mockReport,
      sections: [{ key: 'meals', title: 'Alimentation', content: '', included: false }],
    };
    expect(() => service.generate(emptyReport, null)).not.toThrow();
  });
});
