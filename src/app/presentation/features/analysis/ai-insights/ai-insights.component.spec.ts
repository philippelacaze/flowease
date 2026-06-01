import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { vi } from 'vitest';
import { AiInsightsComponent } from './ai-insights.component';
import { GetInsightsUseCase } from '../../../../application/analysis/get-insights.usecase';
import type { StoredAnalysisResult } from '../../../../application/analysis/run-ai-analysis.usecase';
import type { InsightVO } from '../../../../domain/repositories/ai/analysis.port';

const CURE_COMPARISON_INSIGHT: InsightVO = {
  type: 'cureComparison',
  title: 'Rifaximin — Avant / Pendant / Après',
  description: 'Amélioration nette des symptômes après la cure.',
  confidence: 0.87,
  comparisonPeriods: [
    { label: 'Avant',   avgWellbeing: 4.2, avgSymptomIntensity: 6.1 },
    { label: 'Pendant', avgWellbeing: 3.8, avgSymptomIntensity: 7.2 },
    { label: 'Après',   avgWellbeing: 7.1, avgSymptomIntensity: 3.4 },
  ],
};

const CORRELATION_INSIGHT: InsightVO = {
  type: 'correlation',
  title: 'Blé → Douleurs abdominales',
  description: 'Les douleurs augmentent 2h après ingestion de blé.',
  confidence: 0.82,
};

function makeResult(insights: InsightVO[]): StoredAnalysisResult {
  return {
    id: 'analysis-1',
    available: true,
    insights,
    analyzedAt: new Date('2026-06-01T10:00:00'),
    windowDays: 14,
  };
}

async function createComponent(result: StoredAnalysisResult | null = null) {
  const mockGetInsights = {
    execute: vi.fn().mockResolvedValue(result ? [result] : []),
  };

  await TestBed.configureTestingModule({
    imports: [AiInsightsComponent, NoopAnimationsModule],
    providers: [
      { provide: GetInsightsUseCase, useValue: mockGetInsights },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(AiInsightsComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, mockGetInsights };
}

describe('AiInsightsComponent', () => {

  describe('état vide — aucune analyse', () => {
    it('affiche le message "Aucune analyse effectuée"', async () => {
      const { fixture } = await createComponent(null);
      const el = fixture.nativeElement.querySelector('[data-testid="no-insights"]');
      expect(el).not.toBeNull();
    });
  });

  describe('insights standard (correlation, alert, etc.)', () => {
    it('affiche les cartes d\'insights standards', async () => {
      const { fixture } = await createComponent(makeResult([CORRELATION_INSIGHT]));
      const cards = fixture.nativeElement.querySelectorAll('[data-testid="insight-card"]');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('n\'affiche pas de tableau cure pour un insight standard', async () => {
      const { fixture } = await createComponent(makeResult([CORRELATION_INSIGHT]));
      const table = fixture.nativeElement.querySelector('[data-testid="cure-comparison-table"]');
      expect(table).toBeNull();
    });

    it('affiche le titre et la description de l\'insight', async () => {
      const { fixture } = await createComponent(makeResult([CORRELATION_INSIGHT]));
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain(CORRELATION_INSIGHT.title);
      expect(text).toContain(CORRELATION_INSIGHT.description);
    });
  });

  describe('insight cureComparison', () => {
    it('affiche le tableau de comparaison pour un insight cureComparison', async () => {
      const { fixture } = await createComponent(makeResult([CURE_COMPARISON_INSIGHT]));
      const table = fixture.nativeElement.querySelector('[data-testid="cure-comparison-table"]');
      expect(table).not.toBeNull();
    });

    it('affiche les 3 labels de période dans le tableau', async () => {
      const { fixture } = await createComponent(makeResult([CURE_COMPARISON_INSIGHT]));
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Avant');
      expect(text).toContain('Pendant');
      expect(text).toContain('Après');
    });

    it('affiche les scores bien-être formatés', async () => {
      const { fixture } = await createComponent(makeResult([CURE_COMPARISON_INSIGHT]));
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('4.2/10');
      expect(text).toContain('7.1/10');
    });

    it('affiche la conclusion textuelle (description)', async () => {
      const { fixture } = await createComponent(makeResult([CURE_COMPARISON_INSIGHT]));
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain(CURE_COMPARISON_INSIGHT.description);
    });

    it('affiche "—" pour les valeurs null', async () => {
      const insightWithNull: InsightVO = {
        ...CURE_COMPARISON_INSIGHT,
        comparisonPeriods: [
          { label: 'Avant',   avgWellbeing: 4.2, avgSymptomIntensity: 6.1 },
          { label: 'Pendant', avgWellbeing: null, avgSymptomIntensity: null },
          { label: 'Après',   avgWellbeing: null, avgSymptomIntensity: null },
        ],
      };
      const { fixture } = await createComponent(makeResult([insightWithNull]));
      const dashes = (fixture.nativeElement.textContent as string).match(/—/g);
      expect(dashes).not.toBeNull();
      expect(dashes!.length).toBeGreaterThanOrEqual(4);
    });

    it('place cureComparison avant les autres types', async () => {
      const { fixture } = await createComponent(
        makeResult([CORRELATION_INSIGHT, CURE_COMPARISON_INSIGHT]),
      );
      const groupTitles = fixture.nativeElement.querySelectorAll('.group-title') as NodeListOf<HTMLElement>;
      expect(groupTitles[0]?.textContent).toContain('Comparaison cure');
    });

    it('n\'affiche pas le tableau si comparisonPeriods est absent', async () => {
      const insightWithoutPeriods: InsightVO = {
        type: 'cureComparison',
        title: 'Cure sans données',
        description: 'Description.',
        confidence: 0.75,
      };
      const { fixture } = await createComponent(makeResult([insightWithoutPeriods]));
      const table = fixture.nativeElement.querySelector('[data-testid="cure-comparison-table"]');
      expect(table).toBeNull();
    });
  });
});
