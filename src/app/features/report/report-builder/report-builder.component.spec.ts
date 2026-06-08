import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { ReportBuilderComponent } from './report-builder.component';
import { ReportService } from '../services/report.service';
import { PdfReportService } from '../../../core/services/pdf-report.service';
import { StorageService } from '../../../core/services/storage.service';
import { MatSnackBar } from '@angular/material/snack-bar';

const mockReport = {
  id: 'r1',
  windowDays: 14,
  generatedAt: new Date().toISOString(),
  format: 'text',
  sections: [{ key: 'meals', title: 'Repas', content: 'Test', included: true }],
};

const mockReportService = {
  build: vi.fn().mockResolvedValue(mockReport),
  generateSummary: vi.fn().mockResolvedValue('Résumé IA'),
};
const mockPdfService = { generate: vi.fn() };
const mockSnackBar = { open: vi.fn() };

const mockProfile = {
  id: 'singleton',
  conditions: ['sibo_methane'],
  protocol: 'strict',
  otherConditions: 'Endométriose',
  allergies: 'Arachides',
  dietaryRestrictions: 'Sans lactose',
  language: 'fr',
  theme: 'auto',
  showTokenCounter: false,
  defaultCoachContext: '14',
  updatedAt: new Date(),
};
const mockStorage = { get: vi.fn().mockResolvedValue(mockProfile) };

async function createComponent() {
  await TestBed.configureTestingModule({
    imports: [ReportBuilderComponent, NoopAnimationsModule],
    providers: [
      provideRouter([]),
      { provide: ReportService, useValue: mockReportService },
      { provide: PdfReportService, useValue: mockPdfService },
      { provide: StorageService, useValue: mockStorage },
      { provide: MatSnackBar, useValue: mockSnackBar },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(ReportBuilderComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

type ComponentProtected = {
  format: string;
  downloadAsPdf(): void;
  downloadAsText(): void;
};

describe('ReportBuilderComponent', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('fenêtre temporelle', () => {
    it('affiche 14j sélectionné par défaut', async () => {
      const fixture = await createComponent();
      const active = fixture.nativeElement.querySelector('.window-pill--active');
      expect(active?.textContent?.trim()).toBe('14 j');
    });

    it('sélectionne 7j sur clic', async () => {
      const fixture = await createComponent();
      fixture.nativeElement.querySelector('[data-testid="window-7"]').click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.window-pill--active')?.textContent?.trim()).toBe('7 j');
    });

    it('sélectionne 30j sur clic', async () => {
      const fixture = await createComponent();
      fixture.nativeElement.querySelector('[data-testid="window-30"]').click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.window-pill--active')?.textContent?.trim()).toBe('30 j');
    });

    it('sélectionne 90j sur clic', async () => {
      const fixture = await createComponent();
      fixture.nativeElement.querySelector('[data-testid="window-90"]').click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.window-pill--active')?.textContent?.trim()).toBe('90 j');
    });
  });

  describe('format', () => {
    it('affiche 2 boutons de format', async () => {
      const fixture = await createComponent();
      const btns = fixture.nativeElement.querySelectorAll('.format-btn');
      expect(btns).toHaveLength(2);
    });

    it('sélectionne PDF sur clic', async () => {
      const fixture = await createComponent();
      fixture.nativeElement.querySelector('[data-testid="format-pdf"]').click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="format-pdf"]').classList).toContain('format-btn--active');
    });
  });

  describe('option IA', () => {
    it('toggle la synthèse IA sur clic', async () => {
      const fixture = await createComponent();
      const btn = fixture.nativeElement.querySelector('[data-testid="ai-summary-checkbox"]');
      btn.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.ai-option-check--on')).not.toBeNull();
    });

    it('re-toggle à false sur double clic', async () => {
      const fixture = await createComponent();
      const btn = fixture.nativeElement.querySelector('[data-testid="ai-summary-checkbox"]');
      btn.click(); btn.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.ai-option-check--on')).toBeNull();
    });
  });

  describe('génération', () => {
    it('le bouton generate est actif par défaut', async () => {
      const fixture = await createComponent();
      const btn = fixture.nativeElement.querySelector('[data-testid="generate-button"]');
      expect(btn.disabled).toBe(false);
    });

    it('appelle BuildReportUseCase sur clic generate', async () => {
      const fixture = await createComponent();
      fixture.nativeElement.querySelector('[data-testid="generate-button"]').click();
      await fixture.whenStable();
      expect(mockReportService.build).toHaveBeenCalledOnce();
    });

    it('affiche le résultat après génération', async () => {
      const fixture = await createComponent();
      fixture.nativeElement.querySelector('[data-testid="generate-button"]').click();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="report-result"]')).not.toBeNull();
    });

    it('n\'appelle pas generateSummary si includeAiSummary est false', async () => {
      const fixture = await createComponent();
      fixture.nativeElement.querySelector('[data-testid="generate-button"]').click();
      await fixture.whenStable();
      expect(mockReportService.generateSummary).not.toHaveBeenCalled();
    });

    it('appelle generateSummary si includeAiSummary est true', async () => {
      const fixture = await createComponent();
      fixture.nativeElement.querySelector('[data-testid="ai-summary-checkbox"]').click();
      fixture.nativeElement.querySelector('[data-testid="generate-button"]').click();
      await fixture.whenStable();
      expect(mockReportService.generateSummary).toHaveBeenCalledOnce();
    });

    it('transmet les conditions et le contexte médical libre du profil à generateSummary', async () => {
      const fixture = await createComponent();
      fixture.nativeElement.querySelector('[data-testid="ai-summary-checkbox"]').click();
      fixture.nativeElement.querySelector('[data-testid="generate-button"]').click();
      await fixture.whenStable();
      expect(mockReportService.generateSummary).toHaveBeenCalledWith(
        'r1',
        expect.objectContaining({
          userConditions: ['sibo_methane'],
          otherConditions: 'Endométriose',
          allergies: 'Arachides',
          dietaryRestrictions: 'Sans lactose',
        }),
      );
    });
  });

  describe('téléchargement PDF', () => {
    it('affiche le bouton "Télécharger PDF" quand format = pdf et rapport généré', async () => {
      const fixture = await createComponent();
      fixture.nativeElement.querySelector('[data-testid="format-pdf"]').click();
      fixture.nativeElement.querySelector('[data-testid="generate-button"]').click();
      await fixture.whenStable();
      fixture.detectChanges();
      const btn = fixture.nativeElement.querySelector('[data-testid="download-pdf"]');
      expect(btn).not.toBeNull();
    });

    it('appelle PdfReportService.generate() sur clic "Télécharger PDF"', async () => {
      const fixture = await createComponent();
      fixture.nativeElement.querySelector('[data-testid="format-pdf"]').click();
      fixture.nativeElement.querySelector('[data-testid="generate-button"]').click();
      await fixture.whenStable();
      fixture.detectChanges();
      fixture.nativeElement.querySelector('[data-testid="download-pdf"]').click();
      expect(mockPdfService.generate).toHaveBeenCalledOnce();
    });

    it('PdfReportService.generate() reçoit le rapport et la synthèse IA', async () => {
      const fixture = await createComponent();
      fixture.nativeElement.querySelector('[data-testid="format-pdf"]').click();
      fixture.nativeElement.querySelector('[data-testid="generate-button"]').click();
      await fixture.whenStable();
      fixture.detectChanges();
      fixture.nativeElement.querySelector('[data-testid="download-pdf"]').click();
      expect(mockPdfService.generate).toHaveBeenCalledWith(mockReport, null);
    });

    it('n\'affiche pas le bouton PDF quand format = text', async () => {
      const fixture = await createComponent();
      fixture.nativeElement.querySelector('[data-testid="generate-button"]').click();
      await fixture.whenStable();
      fixture.detectChanges();
      const btn = fixture.nativeElement.querySelector('[data-testid="download-pdf"]');
      expect(btn).toBeNull();
    });
  });

  describe('téléchargement texte', () => {
    it('affiche le bouton "Télécharger .txt" quand format = text et rapport généré', async () => {
      const fixture = await createComponent();
      fixture.nativeElement.querySelector('[data-testid="generate-button"]').click();
      await fixture.whenStable();
      fixture.detectChanges();
      const btn = fixture.nativeElement.querySelector('[data-testid="download-text"]');
      expect(btn).not.toBeNull();
    });

    it('n\'affiche pas le bouton .txt quand format = pdf', async () => {
      const fixture = await createComponent();
      fixture.nativeElement.querySelector('[data-testid="format-pdf"]').click();
      fixture.nativeElement.querySelector('[data-testid="generate-button"]').click();
      await fixture.whenStable();
      fixture.detectChanges();
      const btn = fixture.nativeElement.querySelector('[data-testid="download-text"]');
      expect(btn).toBeNull();
    });
  });

  describe('période personnalisée', () => {
    it('affiche le bouton "Personnalisée" parmi les presets', async () => {
      const fixture = await createComponent();
      const btn = fixture.nativeElement.querySelector('[data-testid="window-custom"]');
      expect(btn).not.toBeNull();
    });

    it('affiche les inputs de date sur clic "Personnalisée"', async () => {
      const fixture = await createComponent();
      fixture.nativeElement.querySelector('[data-testid="window-custom"]').click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="custom-range-inputs"]')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="custom-start-date"]')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="custom-end-date"]')).not.toBeNull();
    });

    it('masque les inputs de date quand un preset numérique est sélectionné', async () => {
      const fixture = await createComponent();
      fixture.nativeElement.querySelector('[data-testid="window-custom"]').click();
      fixture.detectChanges();
      fixture.nativeElement.querySelector('[data-testid="window-7"]').click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="custom-range-inputs"]')).toBeNull();
    });

    it('désactive le bouton générer si les dates sont vides', async () => {
      const fixture = await createComponent();
      fixture.nativeElement.querySelector('[data-testid="window-custom"]').click();
      fixture.detectChanges();
      const btn = fixture.nativeElement.querySelector('[data-testid="generate-button"]');
      expect(btn.disabled).toBe(true);
    });

    it('affiche un message d\'erreur si la date de fin est antérieure à la date de début', async () => {
      const fixture = await createComponent();
      fixture.nativeElement.querySelector('[data-testid="window-custom"]').click();
      fixture.detectChanges();
      await fixture.whenStable();
      const startInput = fixture.nativeElement.querySelector('[data-testid="custom-start-date"]') as HTMLInputElement;
      const endInput = fixture.nativeElement.querySelector('[data-testid="custom-end-date"]') as HTMLInputElement;
      startInput.value = '2026-05-10';
      startInput.dispatchEvent(new Event('input'));
      endInput.value = '2026-05-01';
      endInput.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const error = fixture.nativeElement.querySelector('[data-testid="custom-range-error"]');
      expect(error).not.toBeNull();
    });
  });
});
