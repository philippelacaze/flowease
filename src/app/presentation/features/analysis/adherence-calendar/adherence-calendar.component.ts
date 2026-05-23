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
import { NgFor, NgIf, NgClass, PercentPipe } from '@angular/common';
import {
  GetAdherenceStatsUseCase,
  type AdherenceStat,
} from '../../../../application/analysis/get-adherence-stats.usecase';

interface CalendarDay {
  readonly day: number | null;
  readonly inWindow: boolean;
  readonly colorClass: 'green' | 'orange' | 'red' | 'outside';
}

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

/**
 * Calendrier mensuel heatmap de l'observance des traitements.
 *
 * @remarks
 * Respecte SRP : visualisation de l'observance, sans logique métier.
 * Utilise GetAdherenceStatsUseCase pour le taux moyen sur la fenêtre.
 * Les jours dans la fenêtre reçoivent la couleur du taux d'observance global ;
 * les jours hors fenêtre sont gris — pas de données par jour disponibles.
 * Fonctionne entièrement hors-ligne (lecture IndexedDB uniquement).
 */
@Component({
  selector: 'app-adherence-calendar',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, PercentPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cal-wrapper">
      <div *ngIf="loading" class="cal-state" role="status">Chargement…</div>

      <ng-container *ngIf="!loading">
        <div *ngIf="stats.length === 0" class="cal-state" role="status" data-testid="no-treatments">
          Aucun traitement enregistré.
        </div>

        <ng-container *ngIf="stats.length > 0">
          <!-- Summary rate -->
          <div class="adherence-summary">
            <span class="adherence-rate" [ngClass]="'rate-' + rateColorClass" data-testid="adherence-rate">
              {{ averageAdherence | percent:'1.0-0' }}
            </span>
            <span class="adherence-label">d'observance sur {{ windowDays }}&nbsp;j</span>
          </div>

          <!-- Month name -->
          <p class="month-name">{{ currentMonthName }}</p>

          <!-- Calendar grid -->
          <div
            class="calendar-grid"
            role="grid"
            aria-label="Calendrier mensuel d'observance"
          >
            <div *ngFor="let name of DAY_NAMES" class="day-header" role="columnheader">{{ name }}</div>

            <div
              *ngFor="let cell of calendarDays"
              class="day-cell"
              role="gridcell"
              [ngClass]="[
                cell.day ? 'day-filled' : 'day-empty',
                cell.inWindow ? ('day-' + cell.colorClass) : 'day-outside'
              ]"
              [attr.aria-label]="cell.day
                ? 'Jour ' + cell.day + (cell.inWindow ? ' : observance ' + rateColorClass : ' : hors période')
                : null"
            >
              <span *ngIf="cell.day">{{ cell.day }}</span>
            </div>
          </div>

          <!-- Legend -->
          <div class="legend" aria-label="Légende du calendrier">
            <span class="legend-item green">≥&nbsp;80%</span>
            <span class="legend-item orange">50–80%</span>
            <span class="legend-item red">&lt;&nbsp;50%</span>
            <span class="legend-item outside">hors période</span>
          </div>

          <!-- Treatment list -->
          <ul class="treatment-list" aria-label="Détail par traitement">
            <li *ngFor="let s of stats" class="treatment-item">
              <span class="treatment-name">{{ s.treatmentName }}</span>
              <span class="treatment-rate" [ngClass]="'rate-' + rateClass(s.adherenceRate)">
                {{ s.adherenceRate | percent:'1.0-0' }}
              </span>
            </li>
          </ul>
        </ng-container>
      </ng-container>
    </div>
  `,
  styles: [`
    .cal-wrapper { width: 100%; }

    .cal-state {
      text-align: center;
      padding: 24px;
      color: var(--mat-sys-on-surface-variant);
      font-size: 13px;
    }

    .adherence-summary {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 12px;
    }

    .adherence-rate {
      font-size: 28px;
      font-weight: 700;
    }
    .rate-green  { color: #2e7d32; }
    .rate-orange { color: #e65100; }
    .rate-red    { color: var(--mat-sys-error); }

    .adherence-label {
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
    .day-green   { background: #c8e6c9; color: #1b5e20; }
    .day-orange  { background: #ffe0b2; color: #bf360c; }
    .day-red     { background: #ffcdd2; color: #b71c1c; }

    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
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
    .legend-item.green::before   { background: #c8e6c9; }
    .legend-item.orange::before  { background: #ffe0b2; }
    .legend-item.red::before     { background: #ffcdd2; }
    .legend-item.outside::before { background: var(--mat-sys-surface-container); }

    .treatment-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .treatment-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      padding: 4px 0;
      border-top: 1px solid var(--mat-sys-outline-variant);
    }

    .treatment-name { color: var(--mat-sys-on-surface); }
    .treatment-rate { font-weight: 600; }
  `],
})
export class AdherenceCalendarComponent implements OnInit, OnChanges {
  @Input() windowDays = 30;

  private readonly adherenceUseCase = inject(GetAdherenceStatsUseCase);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected stats: AdherenceStat[] = [];
  protected calendarDays: CalendarDay[] = [];
  protected currentMonthName = '';
  protected readonly DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  protected get averageAdherence(): number {
    if (this.stats.length === 0) return 0;
    return this.stats.reduce((sum, s) => sum + s.adherenceRate, 0) / this.stats.length;
  }

  protected get rateColorClass(): 'green' | 'orange' | 'red' {
    const rate = this.averageAdherence;
    if (rate >= 0.8) return 'green';
    if (rate >= 0.5) return 'orange';
    return 'red';
  }

  protected rateClass(rate: number): 'green' | 'orange' | 'red' {
    if (rate >= 0.8) return 'green';
    if (rate >= 0.5) return 'orange';
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

    this.stats = await this.adherenceUseCase.execute(this.windowDays);
    this.buildCalendar();

    this.loading = false;
    this.cdr.markForCheck();
  }

  private buildCalendar(): void {
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

    const color = this.rateColorClass;
    const hasData = this.stats.length > 0;

    const days: CalendarDay[] = Array.from({ length: startDow }, () => ({
      day: null,
      inWindow: false,
      colorClass: 'outside' as const,
    }));

    for (let d = 1; d <= daysInMonth; d++) {
      const dayDate = new Date(year, month, d, 12, 0, 0, 0);
      const inWindow = dayDate >= windowStart && dayDate <= now;
      days.push({
        day: d,
        inWindow,
        colorClass: inWindow && hasData ? color : 'outside',
      });
    }

    this.calendarDays = days;
  }
}
