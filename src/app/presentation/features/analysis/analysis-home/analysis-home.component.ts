import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  OnInit,
} from '@angular/core';
import { NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RunAiAnalysisUseCase } from '../../../../application/analysis/run-ai-analysis.usecase';
import { LOCAL_SETTINGS_PORT } from '../../../../application/tokens';
import type { LocalSettingsRepository } from '../../../../domain/repositories/local-settings.repository';
import { SymptomChartComponent } from '../symptom-chart/symptom-chart.component';
import { AdherenceCalendarComponent } from '../adherence-calendar/adherence-calendar.component';
import { WellbeingHeatmapComponent } from '../wellbeing-heatmap/wellbeing-heatmap.component';
import { AiInsightsComponent } from '../ai-insights/ai-insights.component';
import {
  RunAnalysisDialogComponent,
  type RunAnalysisDialogData,
} from './run-analysis-dialog.component';

/**
 * Page principale du module Analyse.
 *
 * @remarks
 * Respecte SRP : orchestre l'affichage des visualisations hors-ligne et
 * délègue l'exécution de l'analyse IA à RunAiAnalysisUseCase.
 * Les 3 visualisations s'affichent sans connexion ; seul le bouton "Analyser"
 * déclenche un appel réseau (géré en mode dégradé via NullAIAdapter si pas de clé).
 */
@Component({
  selector: 'app-analysis-home',
  standalone: true,
  imports: [
    NgIf,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatProgressSpinnerModule,
    SymptomChartComponent,
    AdherenceCalendarComponent,
    WellbeingHeatmapComponent,
    AiInsightsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="analysis-home">
      <header class="analysis-header">
        <h1 class="analysis-title">Analyse</h1>

        <mat-button-toggle-group
          [value]="windowDays"
          aria-label="Fenêtre temporelle d'analyse"
          data-testid="window-toggle"
          (change)="onWindowChange($event.value)"
        >
          <mat-button-toggle [value]="7"  aria-label="7 jours">7j</mat-button-toggle>
          <mat-button-toggle [value]="30" aria-label="30 jours">30j</mat-button-toggle>
          <mat-button-toggle [value]="90" aria-label="90 jours">90j</mat-button-toggle>
        </mat-button-toggle-group>
      </header>

      <div
        *ngIf="lastAnalysisDate"
        class="last-analysis-bar"
        role="status"
        aria-live="polite"
        data-testid="last-analysis-bar"
      >
        <mat-icon aria-hidden="true" class="bar-icon">schedule</mat-icon>
        Dernière analyse : {{ lastAnalysisDaysAgo }}
      </div>

      <div *ngIf="analyzing" class="analyzing-row" role="status" aria-live="polite">
        <mat-spinner diameter="24" />
        <span>Analyse en cours…</span>
      </div>

      <div class="analysis-sections">
        <section class="analysis-section" aria-label="Évolution des symptômes">
          <h2 class="section-title">
            <mat-icon aria-hidden="true">trending_up</mat-icon>
            Symptômes
          </h2>
          <app-symptom-chart [symptomKey]="'abdominal_pain'" [windowDays]="windowDays" />
        </section>

        <section class="analysis-section" aria-label="Observance des traitements">
          <h2 class="section-title">
            <mat-icon aria-hidden="true">medication</mat-icon>
            Observance
          </h2>
          <app-adherence-calendar [windowDays]="windowDays" />
        </section>

        <section class="analysis-section" aria-label="Bien-être quotidien">
          <h2 class="section-title">
            <mat-icon aria-hidden="true">favorite</mat-icon>
            Bien-être
          </h2>
          <app-wellbeing-heatmap [windowDays]="windowDays" />
        </section>

        <section class="analysis-section" aria-label="Insights IA">
          <h2 class="section-title">
            <mat-icon aria-hidden="true">auto_awesome</mat-icon>
            Analyses IA
          </h2>
          <app-ai-insights [refreshKey]="insightsRefreshKey" />
        </section>
      </div>
    </div>

    <button
      mat-fab
      color="primary"
      class="analysis-fab"
      aria-label="Lancer une analyse IA"
      data-testid="run-analysis-fab"
      [disabled]="analyzing"
      (click)="openRunDialog()"
    >
      <mat-icon>auto_awesome</mat-icon>
    </button>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; min-height: 100%; position: relative; }

    .analysis-home { flex: 1; padding-bottom: 100px; }

    .analysis-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: var(--mat-sys-surface);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .analysis-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }

    .last-analysis-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
      font-size: 13px;
    }
    .bar-icon { font-size: 16px; width: 16px; height: 16px; }

    .analyzing-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      background: var(--mat-sys-surface-container);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      font-size: 14px;
      color: var(--mat-sys-on-surface-variant);
    }

    .analysis-sections { padding: 4px 0; }

    .analysis-section {
      padding: 16px 16px 12px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .analysis-section:last-child { border-bottom: none; }

    .section-title {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0 0 12px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--mat-sys-primary);
    }
    .section-title mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .analysis-fab {
      position: fixed;
      bottom: 88px;
      right: 16px;
      z-index: 20;
    }
  `],
})
export class AnalysisHomeComponent implements OnInit {
  private readonly runAiAnalysis = inject(RunAiAnalysisUseCase);
  private readonly settings = inject<LocalSettingsRepository>(LOCAL_SETTINGS_PORT as never);
  private readonly dialog = inject(MatDialog);
  private readonly cdr = inject(ChangeDetectorRef);

  protected windowDays = 30;
  protected analyzing = false;
  protected lastAnalysisDate: Date | null = null;
  protected insightsRefreshKey = 0;

  protected get lastAnalysisDaysAgo(): string {
    if (!this.lastAnalysisDate) return '';
    const days = Math.floor((Date.now() - this.lastAnalysisDate.getTime()) / 86_400_000);
    if (days === 0) return 'aujourd\'hui';
    if (days === 1) return 'hier';
    return `il y a ${days} jour${days > 1 ? 's' : ''}`;
  }

  ngOnInit(): void {
    this.lastAnalysisDate = this.settings.getLastAnalysisDate();
  }

  protected onWindowChange(value: number): void {
    this.windowDays = value;
    this.cdr.markForCheck();
  }

  protected openRunDialog(): void {
    const ref = this.dialog.open<RunAnalysisDialogComponent, RunAnalysisDialogData, number | undefined>(
      RunAnalysisDialogComponent,
      {
        data: { defaultWindow: 14 } satisfies RunAnalysisDialogData,
        width: '320px',
      },
    );

    ref.afterClosed().subscribe(async (days) => {
      if (!days) return;
      await this.runAnalysis(days);
    });
  }

  private async runAnalysis(days: number): Promise<void> {
    this.analyzing = true;
    this.cdr.markForCheck();
    try {
      await this.runAiAnalysis.execute(days);
    } finally {
      this.lastAnalysisDate = this.settings.getLastAnalysisDate();
      this.insightsRefreshKey++;
      this.analyzing = false;
      this.cdr.markForCheck();
    }
  }
}
