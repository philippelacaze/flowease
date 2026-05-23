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
import { NgFor, NgIf, NgClass, DecimalPipe } from '@angular/common';
import {
  GetSymptomTrendsUseCase,
  type TrendData,
} from '../../../../application/analysis/get-symptom-trends.usecase';

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
 * Calendrier mensuel heatmap du score de bien-être quotidien.
 *
 * @remarks
 * Respecte SRP : visualisation uniquement, sans logique métier.
 * Lit les données via GetSymptomTrendsUseCase avec symptomKey='wellbeing_score'.
 * Couleur par jour : vert ≥7 / orange 4–6 / rouge ≤3 / gris = pas de saisie.
 * Fonctionne hors-ligne (lecture IndexedDB uniquement).
 */
@Component({
  selector: 'app-wellbeing-heatmap',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="heatmap-wrapper">
      <div *ngIf="loading" class="heatmap-state" role="status">Chargement…</div>

      <ng-container *ngIf="!loading">
        <div *ngIf="noData" class="heatmap-state" role="status" data-testid="no-wellbeing-data">
          Aucun score de bien-être enregistré.
          <br>
          <small>Saisissez un score dans le journal (symptôme "wellbeing_score").</small>
        </div>

        <ng-container *ngIf="!noData">
          <!-- Monthly average -->
          <div class="wellbeing-summary" *ngIf="monthlyAverage !== null">
            <span class="wellbeing-score" [ngClass]="'score-' + avgColorClass" data-testid="wellbeing-average">
              {{ monthlyAverage | number:'1.1-1' }}/10
            </span>
            <span class="wellbeing-label">bien-être moyen sur {{ windowDays }}&nbsp;j</span>
          </div>

          <!-- Month name -->
          <p class="month-name">{{ currentMonthName }}</p>

          <!-- Calendar grid -->
          <div
            class="calendar-grid"
            role="grid"
            aria-label="Calendrier mensuel de bien-être"
          >
            <div *ngFor="let name of DAY_NAMES" class="day-header" role="columnheader">{{ name }}</div>

            <div
              *ngFor="let cell of calendarDays"
              class="day-cell"
              role="gridcell"
              [ngClass]="[
                cell.day ? 'day-filled' : 'day-empty',
                cell.inWindow
                  ? (cell.score !== null ? ('day-' + cell.colorClass) : 'day-nodata')
                  : 'day-outside'
              ]"
              [attr.aria-label]="cell.day
                ? ('Jour ' + cell.day + (cell.score !== null ? ' : ' + cell.score + '/10' : ' : pas de saisie'))
                : null"
              [attr.title]="cell.score !== null ? (cell.score + '/10') : null"
            >
              <span *ngIf="cell.day">{{ cell.day }}</span>
            </div>
          </div>

          <!-- Legend -->
          <div class="legend" aria-label="Légende du calendrier">
            <span class="legend-item green">≥&nbsp;7</span>
            <span class="legend-item orange">4–6</span>
            <span class="legend-item red">≤&nbsp;3</span>
            <span class="legend-item nodata">pas de saisie</span>
          </div>
        </ng-container>
      </ng-container>
    </div>
  `,
  styles: [`
    .heatmap-wrapper { width: 100%; }

    .heatmap-state {
      text-align: center;
      padding: 24px;
      color: var(--mat-sys-on-surface-variant);
      font-size: 13px;
      line-height: 1.6;
    }

    .wellbeing-summary {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 12px;
    }

    .wellbeing-score {
      font-size: 28px;
      font-weight: 700;
    }
    .score-green  { color: #2e7d32; }
    .score-orange { color: #e65100; }
    .score-red    { color: var(--mat-sys-error); }

    .wellbeing-label {
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
    }

    .month-name {
      font-size: 13px;
      font-weight: 600;
      text-align: center;
      margin: 0 0 8px;
      color: var(--mat-sys-on-surface-variant);
    }

    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 3px;
      margin-bottom: 8px;
    }

    .day-header {
      text-align: center;
      font-size: 10px;
      font-weight: 600;
      color: var(--mat-sys-on-surface-variant);
      padding: 2px 0;
    }

    .day-cell {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
      min-height: 28px;
    }

    .day-empty   { background: transparent; }
    .day-outside { background: var(--mat-sys-surface-container); color: var(--mat-sys-on-surface-variant); opacity: 0.5; }
    .day-nodata  { background: var(--mat-sys-surface-container); color: var(--mat-sys-on-surface-variant); }
    .day-green   { background: #c8e6c9; color: #1b5e20; }
    .day-orange  { background: #ffe0b2; color: #bf360c; }
    .day-red     { background: #ffcdd2; color: #b71c1c; }

    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 11px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .legend-item::before {
      content: '';
      width: 12px;
      height: 12px;
      border-radius: 3px;
      display: inline-block;
    }
    .legend-item.green::before  { background: #c8e6c9; }
    .legend-item.orange::before { background: #ffe0b2; }
    .legend-item.red::before    { background: #ffcdd2; }
    .legend-item.nodata::before { background: var(--mat-sys-surface-container); }
  `],
})
export class WellbeingHeatmapComponent implements OnInit, OnChanges {
  @Input() windowDays = 30;

  private readonly trendsUseCase = inject(GetSymptomTrendsUseCase);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected noData = false;
  protected calendarDays: CalendarDay[] = [];
  protected currentMonthName = '';
  protected monthlyAverage: number | null = null;
  protected readonly DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  protected get avgColorClass(): 'green' | 'orange' | 'red' {
    const avg = this.monthlyAverage ?? 0;
    if (avg >= 7) return 'green';
    if (avg >= 4) return 'orange';
    return 'red';
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

    const trends = await this.trendsUseCase.execute(this.windowDays, 'wellbeing_score');
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
        colorClass = score >= 7 ? 'green' : score >= 4 ? 'orange' : 'red';
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
