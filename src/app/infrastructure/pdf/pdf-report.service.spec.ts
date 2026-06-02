import { vi } from 'vitest';

// vi.fn() stable : la même référence est réutilisée à chaque re-run en watch mode.
// mockImplementation avec `class` (requis par Vitest pour les constructeurs) est
// reconfiguré dans beforeEach pour pointer vers le mockDoc du test courant.
vi.mock('jspdf', () => ({
  jsPDF: vi.fn(),
}));

import { TestBed } from '@angular/core/testing';
import { jsPDF } from 'jspdf';
import { PdfReportService } from './pdf-report.service';
import type { ReportEntity } from '../../domain/entities/report.entity';

function createMockDoc() {
  return {
    setFont:          vi.fn().mockReturnThis(),
    setFontSize:      vi.fn().mockReturnThis(),
    setTextColor:     vi.fn().mockReturnThis(),
    text:             vi.fn().mockReturnThis(),
    setDrawColor:     vi.fn().mockReturnThis(),
    setLineWidth:     vi.fn().mockReturnThis(),
    line:             vi.fn().mockReturnThis(),
    splitTextToSize:  vi.fn().mockReturnValue(['line 1', 'line 2']),
    addPage:          vi.fn().mockReturnThis(),
    getNumberOfPages: vi.fn().mockReturnValue(1),
    setPage:          vi.fn().mockReturnThis(),
    save:             vi.fn(),
  };
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
  let service: PdfReportService;
  let mockDoc: ReturnType<typeof createMockDoc>;

  beforeEach(() => {
    mockDoc = createMockDoc();

    // Vitest requiert `class` pour les mocks de constructeur.
    // Object.assign copie les vi.fn() de mockDoc vers `this` :
    // doc.save === mockDoc.save → les assertions sur mockDoc restent valides.
    const snapshot = mockDoc;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (jsPDF as any).mockImplementation(class { constructor() { Object.assign(this as object, snapshot); } });

    TestBed.configureTestingModule({ providers: [PdfReportService] });
    service = TestBed.inject(PdfReportService);
  });

  it('ne lève pas d\'exception pour un rapport valide sans synthèse IA', () => {
    expect(() => service.generate(mockReport, null)).not.toThrow();
  });

  it('ne lève pas d\'exception avec une synthèse IA fournie', () => {
    expect(() => service.generate(mockReport, 'Synthèse IA de test')).not.toThrow();
  });

  it('appelle doc.save() pour déclencher le téléchargement', () => {
    service.generate(mockReport, null);
    expect(mockDoc.save).toHaveBeenCalledOnce();
  });

  it('utilise le nom de fichier FlowEase_rapport_YYYY-MM-DD.pdf', () => {
    service.generate(mockReport, null);
    const filename = mockDoc.save.mock.calls[0][0] as string;
    expect(filename).toMatch(/^FlowEase_rapport_\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  it('écrit le texte "FlowEase" dans le PDF', () => {
    service.generate(mockReport, null);
    const textCalls = mockDoc.text.mock.calls.map((c: unknown[]) => c[0]);
    expect(textCalls).toContain('FlowEase');
  });

  it('inclut les titres des sections incluses', () => {
    service.generate(mockReport, null);
    const textCalls = mockDoc.text.mock.calls.map((c: unknown[]) => String(c[0]).toUpperCase());
    expect(textCalls.some((t: string) => t.includes('ALIMENTATION'))).toBe(true);
    expect(textCalls.some((t: string) => t.includes('SYMPTÔMES'))).toBe(true);
  });

  it('ignore les sections dont included === false', () => {
    service.generate(mockReport, null);
    const textCalls = mockDoc.text.mock.calls.map((c: unknown[]) => String(c[0]).toUpperCase());
    expect(textCalls.some((t: string) => t.includes('NOTES'))).toBe(false);
  });

  it('inclut le titre de synthèse IA quand elle est fournie', () => {
    service.generate(mockReport, 'Ma synthèse IA');
    const textCalls = mockDoc.text.mock.calls.map((c: unknown[]) => String(c[0]).toUpperCase());
    expect(textCalls.some((t: string) => t.includes('SYNTHÈSE IA'))).toBe(true);
  });

  it('n\'inclut pas de section synthèse IA quand elle est null', () => {
    service.generate(mockReport, null);
    const textCalls = mockDoc.text.mock.calls.map((c: unknown[]) => String(c[0]).toUpperCase());
    expect(textCalls.some((t: string) => t.includes('SYNTHÈSE IA'))).toBe(false);
  });

  it('gère un rapport sans sections incluses sans lever d\'exception', () => {
    const emptyReport: ReportEntity = {
      ...mockReport,
      sections: [{ key: 'meals', title: 'Alimentation', content: '', included: false }],
    };
    expect(() => service.generate(emptyReport, null)).not.toThrow();
  });
});
