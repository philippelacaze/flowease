import {
  Component,
  Input,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AnalysisService } from '../services/analysis.service';
import type { StoredAnalysisResult } from '../services/analysis.service';
import type { InsightVO, InsightType } from '../../../core/services/ai.service';

interface InsightCard {
  readonly insight: InsightVO;
  readonly analysisDate: Date;
  readonly windowDays: number;
}

/**
 * Affiche les cartes d'insights issus de la dernière analyse IA.
 *
 * @remarks
 * Respecte SRP : lecture et affichage des résultats stockés, sans déclenchement
 * d'appel réseau. Résultats lus depuis IndexedDB via GetInsightsUseCase (offline).
 * refreshKey en Input permet de forcer un rechargement après une nouvelle analyse.
 */
@Component({
  selector: 'app-ai-insights',
  standalone: true,
  imports: [DatePipe, DecimalPipe, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ai-insights.component.html',
  styleUrl: './ai-insights.component.scss',
})
export class AiInsightsComponent implements OnInit, OnChanges {
  @Input() refreshKey = 0;

  private readonly analysis = inject(AnalysisService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected lastResult: StoredAnalysisResult | null = null;
  protected cards: InsightCard[] = [];
  protected copied = false;

  private readonly TYPE_META: Record<InsightType, { label: string; icon: string }> = {
    cureComparison:  { label: 'Comparaison cure',   icon: 'compare_arrows' },
    correlation:     { label: 'Corrélations',        icon: 'hub' },
    pattern:         { label: 'Patterns',             icon: 'timeline' },
    alert:           { label: 'Alertes',              icon: 'warning' },
    recommendation:  { label: 'Recommandations',      icon: 'lightbulb' },
  };

  private readonly TYPE_ORDER: InsightType[] = ['cureComparison', 'alert', 'correlation', 'pattern', 'recommendation'];

  protected get insightGroups(): { type: InsightType; label: string; icon: string; cards: InsightCard[] }[] {
    return this.TYPE_ORDER
      .map(type => ({
        type,
        ...this.TYPE_META[type],
        cards: this.cards.filter(c => c.insight.type === type),
      }))
      .filter(g => g.cards.length > 0);
  }

  ngOnInit(): void {
    void this.loadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['refreshKey'] && !changes['refreshKey'].firstChange) {
      void this.loadData();
    }
  }

  protected async copyForDoctor(): Promise<void> {
    if (!this.lastResult?.available) return;

    const lines = [
      `Analyse FlowEase du ${new Date(this.lastResult.analyzedAt).toLocaleDateString('fr-FR')} (${this.lastResult.windowDays} jours)`,
      '',
      ...this.lastResult.insights.map(i =>
        `[${i.type.toUpperCase()}] ${i.title}\n${i.description}`,
      ),
    ];

    await navigator.clipboard.writeText(lines.join('\n'));
    this.copied = true;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.copied = false;
      this.cdr.markForCheck();
    }, 2000);
  }

  private async loadData(): Promise<void> {
    this.loading = true;
    this.cdr.markForCheck();

    const results = await this.analysis.getInsights(1);
    this.lastResult = results[0] ?? null;

    this.cards = this.lastResult?.available
      ? this.lastResult.insights.map(insight => ({
          insight,
          analysisDate: new Date(this.lastResult!.analyzedAt),
          windowDays: this.lastResult!.windowDays,
        }))
      : [];

    this.loading = false;
    this.cdr.markForCheck();
  }
}
