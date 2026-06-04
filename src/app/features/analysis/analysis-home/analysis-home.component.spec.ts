import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { LocalSettingsService } from '../../../core/services/local-settings.service';
import { vi } from 'vitest';
import { AnalysisHomeComponent } from './analysis-home.component';
import { AnalysisService } from '../services/analysis.service';
import { MatBottomSheet } from '@angular/material/bottom-sheet';

const mockSettings = {
  getLastAnalysisDate: vi.fn().mockReturnValue(null),
  getApiKey: vi.fn().mockReturnValue(null),
};

const mockAnalysis = {
  run: vi.fn().mockResolvedValue({ available: false, insights: [] }),
  getInsights: vi.fn().mockResolvedValue([]),
  getSymptomTrends: vi.fn().mockResolvedValue([]),
  getAdherenceStats: vi.fn().mockResolvedValue([]),
};
const mockBottomSheet = {
  open: vi.fn().mockReturnValue({ afterDismissed: () => ({ subscribe: vi.fn() }) }),
};

async function createComponent() {
  await TestBed.configureTestingModule({
    imports: [AnalysisHomeComponent, NoopAnimationsModule],
    providers: [
      { provide: AnalysisService, useValue: mockAnalysis },
      { provide: LocalSettingsService, useValue: mockSettings },
      { provide: MatBottomSheet, useValue: mockBottomSheet },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(AnalysisHomeComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

describe('AnalysisHomeComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettings.getLastAnalysisDate.mockReturnValue(null);
    mockAnalysis.run.mockResolvedValue({ available: false, insights: [] });
    mockAnalysis.getInsights.mockResolvedValue([]);
    mockAnalysis.getSymptomTrends.mockResolvedValue([]);
    mockAnalysis.getAdherenceStats.mockResolvedValue([]);
  });

  describe('fenêtre temporelle', () => {
    it('affiche 30j sélectionné par défaut', async () => {
      const fixture = await createComponent();
      const active = fixture.nativeElement.querySelector('.window-pill--active');
      expect(active?.textContent?.trim()).toBe('30j');
    });

    it('change la fenêtre quand on clique sur 7j', async () => {
      const fixture = await createComponent();
      const pills = fixture.nativeElement.querySelectorAll('.window-pill');
      pills[0].click();
      fixture.detectChanges();
      const active = fixture.nativeElement.querySelector('.window-pill--active');
      expect(active?.textContent?.trim()).toBe('7j');
    });

    it('change la fenêtre quand on clique sur 90j', async () => {
      const fixture = await createComponent();
      const pills = fixture.nativeElement.querySelectorAll('.window-pill');
      pills[2].click();
      fixture.detectChanges();
      const active = fixture.nativeElement.querySelector('.window-pill--active');
      expect(active?.textContent?.trim()).toBe('90j');
    });
  });

  describe('dernière analyse', () => {
    it('n\'affiche pas la barre si aucune analyse précédente', async () => {
      const fixture = await createComponent();
      const bar = fixture.nativeElement.querySelector('[data-testid="last-analysis-bar"]');
      expect(bar).toBeNull();
    });

    it('affiche la barre si une analyse a déjà été faite', async () => {
      mockSettings.getLastAnalysisDate.mockReturnValue(new Date());
      const fixture = await createComponent();
      const bar = fixture.nativeElement.querySelector('[data-testid="last-analysis-bar"]');
      expect(bar).not.toBeNull();
    });
  });

  describe('FAB', () => {
    it('ouvre la sheet quand on clique sur le FAB', async () => {
      const fixture = await createComponent();
      const fab = fixture.nativeElement.querySelector('[data-testid="run-analysis-fab"]');
      fab.click();
      expect(mockBottomSheet.open).toHaveBeenCalledOnce();
    });

    it('désactive le FAB pendant l\'analyse', async () => {
      const fixture = await createComponent();
      const comp = fixture.componentInstance as unknown as { analyzing: boolean };
      comp.analyzing = true;
      fixture.detectChanges();
      const fab = fixture.nativeElement.querySelector('[data-testid="run-analysis-fab"]');
      expect(fab.disabled).toBe(true);
    });
  });

  describe('sélecteurs de symptômes', () => {
    it('affiche le select primaire et secondaire', async () => {
      const fixture = await createComponent();
      expect(fixture.nativeElement.querySelector('[data-testid="primary-symptom-select"]')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="secondary-symptom-select"]')).not.toBeNull();
    });
  });
});