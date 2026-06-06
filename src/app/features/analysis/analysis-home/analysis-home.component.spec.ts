import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { LocalSettingsService } from '../../../core/services/local-settings.service';
import { vi } from 'vitest';
import { AnalysisHomeComponent } from './analysis-home.component';
import { AnalysisService } from '../services/analysis.service';
import { SymptomService } from '../../journal/services/symptom.service';
import { MatBottomSheet } from '@angular/material/bottom-sheet';

const DEFAULT_MOCK_CONFIGS = [
  { id: 'abdominal_pain', key: 'abdominal_pain', label: 'Douleur abdominale', order: 0, custom: false },
  { id: 'bloating',       key: 'bloating',       label: 'Ballonnements',      order: 1, custom: false },
  { id: 'fatigue',        key: 'fatigue',         label: 'Fatigue',            order: 2, custom: false },
];

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

const mockSymptomSvc = {
  getActiveConfigs: vi.fn().mockResolvedValue([...DEFAULT_MOCK_CONFIGS]),
};

async function createComponent() {
  await TestBed.configureTestingModule({
    imports: [AnalysisHomeComponent, NoopAnimationsModule],
    providers: [
      { provide: AnalysisService, useValue: mockAnalysis },
      { provide: LocalSettingsService, useValue: mockSettings },
      { provide: MatBottomSheet, useValue: mockBottomSheet },
      { provide: SymptomService, useValue: mockSymptomSvc },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(AnalysisHomeComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
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
    mockSymptomSvc.getActiveConfigs.mockResolvedValue([...DEFAULT_MOCK_CONFIGS]);
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

    it('symptomOptions reflète les configs actives depuis SymptomService', async () => {
      const fixture = await createComponent();
      const comp = fixture.componentInstance as unknown as { symptomOptions: { key: string; label: string }[] };
      expect(comp.symptomOptions).toHaveLength(DEFAULT_MOCK_CONFIGS.length);
      expect(comp.symptomOptions[0].key).toBe('abdominal_pain');
      expect(comp.symptomOptions[0].label).toBe('Douleur abdominale');
    });

    it('les options du select reflètent les labels des configs actives', async () => {
      const fixture = await createComponent();
      const options = fixture.nativeElement.querySelectorAll('[data-testid="primary-symptom-select"] option') as NodeListOf<HTMLOptionElement>;
      const labels = Array.from(options).map(o => o.textContent?.trim());
      expect(labels).toContain('Douleur abdominale');
      expect(labels).toContain('Ballonnements');
      expect(labels).toContain('Fatigue');
    });

    it('appelle getActiveConfigs lors de l\'initialisation', async () => {
      await createComponent();
      expect(mockSymptomSvc.getActiveConfigs).toHaveBeenCalledOnce();
    });
  });
});