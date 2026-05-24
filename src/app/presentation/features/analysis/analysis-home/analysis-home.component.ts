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
  templateUrl: './analysis-home.component.html',
  styleUrl: './analysis-home.component.scss',
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
