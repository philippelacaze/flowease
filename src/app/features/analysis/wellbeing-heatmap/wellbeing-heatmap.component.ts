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
import { NgClass, DecimalPipe } from '@angular/common';
import { AnalysisService, type TrendData } from '../services/analysis.service';

interface CalendarDay {
  readonly day: number | null;
  readonly inWindow: boolean;
  readonly colorClass: 'green' | 'orange' | 'red' | 'outside';
  readonly score: number | null;
}

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

/**
 * Calendrier mensuel heatmap du score de mal-être quotidien.
 *
 * @remarks
 * Respecte SRP : visualisation uniquement, sans logique métier.
 * Lit les données via GetSymptomTrendsUseCase avec symptomKey='wellbeing_score'.
 * Échelle uniforme 0 = absent → 10 = intense : un score élevé = mal-être fort.
 * Couleur par jour : rouge ≥7 / orange 4–6 / vert ≤3 / gris = pas de saisie.
 * Fonctionne hors-ligne (lecture IndexedDB uniquement).
 */
@Component({
  selector: 'app-wellbeing-heatmap',
  standalone: true,
  imports: [NgClass, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './wellbeing-heatmap.component.html',
  styleUrl: './wellbeing-heatmap.component.scss',
})
export class WellbeingHeatmapComponent implements OnInit, OnChanges {
  @Input() windowDays = 30;

  private readonly analysis = inject(AnalysisService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected noData = false;
  protected calendarDays: CalendarDay[] = [];
  protected currentMonthName = '';
  protected monthlyAverage: number | null = null;
  protected readonly DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  protected get avgColorClass(): 'green' | 'orange' | 'red' {
    const avg = this.monthlyAverage ?? 0;
    if (avg >= 7) return 'red';
    if (avg >= 4) return 'orange';
    return 'green';
  }

  ngOnInit(): void {
    void this.loadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['windowDays'] && !changes['windowDays'].firstChange) {
      void this.loadData();
    }
  }

  private async loadData(): Promise<void> {
    this.loading = true;
    this.cdr.markForCheck();

    const trends = await this.analysis.getSymptomTrends(this.windowDays, 'wellbeing_score');
    this.buildCalendar(trends);

    this.loading = false;
    this.cdr.markForCheck();
  }

  private buildCalendar(trends: TrendData[]): void {
    const trendMap = new Map(trends.map(t => [t.date, t.averageIntensity]));
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    this.currentMonthName = `${MONTH_NAMES[month]} ${year}`;

    const firstDay = new Date(year, month, 1);
    const startDow = (firstDay.getDay() + 6) % 7; // Mon=0, Sun=6
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() - this.windowDays);
    windowStart.setHours(0, 0, 0, 0);

    const days: CalendarDay[] = Array.from({ length: startDow }, () => ({
      day: null,
      inWindow: false,
      colorClass: 'outside' as const,
      score: null,
    }));

    let dataCount = 0;
    let totalScore = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dayDate = new Date(year, month, d, 12, 0, 0, 0);
      const inWindow = dayDate >= windowStart && dayDate <= now;
      const dateStr = dayDate.toISOString().slice(0, 10);
      const score = trendMap.get(dateStr) ?? null;

      if (score !== null) {
        dataCount++;
        totalScore += score;
      }

      let colorClass: CalendarDay['colorClass'] = 'outside';
      if (inWindow && score !== null) {
        colorClass = score >= 7 ? 'red' : score >= 4 ? 'orange' : 'green';
      }

      days.push({ day: d, inWindow, colorClass, score });
    }

    this.calendarDays = days;
    this.noData = trends.length === 0;
    this.monthlyAverage = dataCount > 0
      ? Math.round((totalScore / dataCount) * 10) / 10
      : null;
  }
}
