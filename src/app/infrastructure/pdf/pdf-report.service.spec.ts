import { vi } from 'vitest';

// Conteneur stable partagé entre la factory vi.mock et beforeEach.
//
// Problème : vi.hoisted() est ré-évalué à chaque invalidation de module
// en watch mode, créant un nouveau _docRef. La factory vi.mock garde
// l'ancienne closure → désynchronisation.
//
// Solution : stocker le conteneur dans globalThis. Si _docRef existe déjà
// (re-run watch mode), vi.hoisted() retourne le MÊME objet → factory et
// beforeEach partagent toujours la même référence, en local et en CI.
const _docRef = vi.hoisted(() => {
  const KEY = '__pdf_report_mock__';
  const g = globalThis as Record<string, unknown>;
  if (!g[KEY]) g[KEY] = { doc: null as Record<string, unknown> | null };
  return g[KEY] as { doc: Record<string, unknown> | null };
});

// Factory : fonction régulière (pas arrow, pas class) utilisable avec new.
// Object.assign copie les vi.fn() du mockDoc courant vers `this`,
// donc doc.save === mockDoc.save dans les assertions.
vi.mock('jspdf', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsPDF: function(this: unknown) {
    if (_docRef.doc) Object.assign(this as object, _docRef.doc);
  },
}));

import { TestBed } from '@angular/core/testing';
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
    _docRef.doc = mockDoc;
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
