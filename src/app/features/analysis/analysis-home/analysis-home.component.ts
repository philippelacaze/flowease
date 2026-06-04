import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  OnInit,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { LocalSettingsService } from '../../../core/services/local-settings.service';
import { AnalysisService } from '../services/analysis.service';
import { SymptomChartComponent } from '../symptom-chart/symptom-chart.component';
import { AdherenceCalendarComponent } from '../adherence-calendar/adherence-calendar.component';
import { WellbeingHeatmapComponent } from '../wellbeing-heatmap/wellbeing-heatmap.component';
import { AiInsightsComponent } from '../ai-insights/ai-insights.component';
import { RunAnalysisSheetComponent } from './run-analysis-sheet.component';

export const SYMPTOM_OPTIONS = [
  { key: 'abdominal_pain',  label: 'Douleur abdominale' },
  { key: 'bloating',        label: 'Ballonnement' },
  { key: 'nausea',          label: 'Nausée' },
  { key: 'gas',             label: 'Gaz' },
  { key: 'constipation',    label: 'Constipation' },
  { key: 'diarrhea',        label: 'Diarrhée' },
  { key: 'fatigue',         label: 'Fatigue' },
  { key: 'wellbeing_score', label: 'Bien-être' },
] as const;

/**
 * Page principale du module Analyse.
 *
 * @remarks
 * Respecte SRP : orchestre l'affichage des visualisations hors-ligne et
 * délègue l'exécution de l'analyse IA à RunAiAnalysisUseCase.
 * Les visualisations s'affichent sans connexion ; seul le bouton "Analyser"
 * déclenche un appel réseau (géré en mode dégradé via NullAiService si pas de clé).
 * Le sélecteur de symptômes secondaire est géré dans ce composant (pas dans le chart).
 */
@Component({
  selector: 'app-analysis-home',
  standalone: true,
  imports: [
    FormsModule,
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
  private readonly analysis = inject(AnalysisService);
  private readonly settings = inject(LocalSettingsService);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly cdr = inject(ChangeDetectorRef);

  protected windowDays = 30;
  protected analyzing = false;
  protected lastAnalysisDate: Date | null = null;
  protected insightsRefreshKey = 0;
  protected primarySymptom = 'abdominal_pain';
  protected secondarySymptom: string | null = null;
  protected readonly symptomOptions = SYMPTOM_OPTIONS;

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

  protected onSymptomChange(): void {
    this.cdr.markForCheck();
  }

  protected openRunDialog(): void {
    const ref = this.bottomSheet.open(RunAnalysisSheetComponent);
    ref.afterDismissed().subscribe(async (days: number | undefined) => {
      if (days) await this.runAnalysis(days);
    });
  }

  private async runAnalysis(days: number): Promise<void> {
    this.analyzing = true;
    this.cdr.markForCheck();
    try {
      await this.analysis.run(days);
    } finally {
      this.lastAnalysisDate = this.settings.getLastAnalysisDate();
      this.insightsRefreshKey++;
      this.analyzing = false;
      this.cdr.markForCheck();
    }
  }
}