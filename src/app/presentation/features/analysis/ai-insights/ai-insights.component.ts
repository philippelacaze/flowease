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
import { NgIf, NgFor, DatePipe, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { GetInsightsUseCase } from '../../../../application/analysis/get-insights.usecase';
import type { StoredAnalysisResult } from '../../../../application/analysis/run-ai-analysis.usecase';
import type { InsightVO, InsightType } from '../../../../domain/repositories/ai/analysis.port';

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
  imports: [NgIf, NgFor, DatePipe, DecimalPipe, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="insights-wrapper">
      <div *ngIf="loading" class="insights-state" role="status">Chargement…</div>

      <ng-container *ngIf="!loading">
        <div *ngIf="!lastResult" class="insights-state" role="status" data-testid="no-insights">
          <mat-icon aria-hidden="true" class="empty-icon">auto_awesome</mat-icon>
          <p>Aucune analyse effectuée.</p>
          <p class="empty-hint">Appuyez sur le bouton ✨ pour lancer votre première analyse IA.</p>
        </div>

        <div *ngIf="lastResult && !lastResult.available" class="insights-state" role="status" data-testid="analysis-degraded">
          <mat-icon aria-hidden="true" class="empty-icon">cloud_off</mat-icon>
          <p>Analyse IA indisponible.</p>
          <p class="empty-hint">Configurez votre clé API Anthropic dans les Paramètres.</p>
        </div>

        <ng-container *ngIf="lastResult?.available">
          <!-- Analysis metadata -->
          <div class="analysis-meta">
            <span class="meta-date">
              Analysé le {{ lastResult!.analyzedAt | date:'d MMM yyyy à HH:mm' }}
              — fenêtre {{ lastResult!.windowDays }}&nbsp;j
            </span>
            <button
              mat-stroked-button
              class="copy-btn"
              aria-label="Copier le résumé de l'analyse pour votre médecin"
              data-testid="copy-for-doctor"
              (click)="copyForDoctor()"
            >
              <mat-icon aria-hidden="true">content_copy</mat-icon>
              Copier pour mon médecin
            </button>
          </div>

          <div *ngIf="copied" class="copy-feedback" role="status">Copié !</div>

          <!-- Insight cards by type -->
          <ng-container *ngFor="let group of insightGroups">
            <h3 class="group-title">
              <mat-icon aria-hidden="true" class="group-icon">{{ group.icon }}</mat-icon>
              {{ group.label }}
            </h3>

            <div class="insight-card" *ngFor="let card of group.cards" data-testid="insight-card">
              <div class="card-header">
                <span class="card-title">{{ card.insight.title }}</span>
                <span
                  class="confidence-badge"
                  [class.confidence-high]="card.insight.confidence >= 0.8"
                  [class.confidence-medium]="card.insight.confidence >= 0.5 && card.insight.confidence < 0.8"
                  [class.confidence-low]="card.insight.confidence < 0.5"
                  [attr.aria-label]="'Confiance : ' + (card.insight.confidence * 100 | number:'1.0-0') + '%'"
                >
                  {{ card.insight.confidence * 100 | number:'1.0-0' }}%
                </span>
              </div>
              <p class="card-description">{{ card.insight.description }}</p>
            </div>
          </ng-container>

          <div *ngIf="cards.length === 0" class="insights-state" role="status">
            L'analyse n'a pas identifié d'insights sur cette période.
          </div>
        </ng-container>
      </ng-container>
    </div>
  `,
  styles: [`
    .insights-wrapper { width: 100%; }

    .insights-state {
      text-align: center;
      padding: 24px 16px;
      color: var(--mat-sys-on-surface-variant);
      font-size: 13px;
      line-height: 1.6;
    }
    .empty-icon { font-size: 40px; width: 40px; height: 40px; opacity: 0.4; margin-bottom: 8px; }
    .empty-hint { font-size: 12px; opacity: 0.7; margin: 4px 0 0; }

    .analysis-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 12px;
    }

    .meta-date {
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
    }

    .copy-btn {
      font-size: 12px;
      height: 32px;
      line-height: 32px;
    }

    .copy-feedback {
      font-size: 12px;
      color: #2e7d32;
      text-align: right;
      margin-bottom: 8px;
    }

    .group-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--mat-sys-on-surface-variant);
      margin: 16px 0 8px;
    }
    .group-icon { font-size: 16px; width: 16px; height: 16px; }

    .insight-card {
      background: var(--mat-sys-surface-container);
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 8px;
    }

    .card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
    }

    .card-title {
      font-size: 14px;
      font-weight: 600;
      line-height: 1.3;
    }

    .confidence-badge {
      flex-shrink: 0;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 10px;
      white-space: nowrap;
    }
    .confidence-high   { background: #c8e6c9; color: #1b5e20; }
    .confidence-medium { background: #ffe0b2; color: #bf360c; }
    .confidence-low    { background: #ffcdd2; color: #b71c1c; }

    .card-description {
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
      margin: 0;
      line-height: 1.5;
    }
  `],
})
export class AiInsightsComponent implements OnInit, OnChanges {
  @Input() refreshKey = 0;

  private readonly getInsights = inject(GetInsightsUseCase);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected lastResult: StoredAnalysisResult | null = null;
  protected cards: InsightCard[] = [];
  protected copied = false;

  private readonly TYPE_META: Record<InsightType, { label: string; icon: string }> = {
    correlation:     { label: 'Corrélations',      icon: 'hub' },
    pattern:         { label: 'Patterns',           icon: 'timeline' },
    alert:           { label: 'Alertes',            icon: 'warning' },
    recommendation:  { label: 'Recommandations',    icon: 'lightbulb' },
  };

  private readonly TYPE_ORDER: InsightType[] = ['alert', 'correlation', 'pattern', 'recommendation'];

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

    const results = await this.getInsights.execute(1);
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
