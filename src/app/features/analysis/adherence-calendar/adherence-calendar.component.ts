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
import { NgClass, PercentPipe } from '@angular/common';
import { AnalysisService, type AdherenceStat } from '../services/analysis.service';

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
  imports: [NgClass, PercentPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './adherence-calendar.component.html',
  styleUrl: './adherence-calendar.component.scss',
})
export class AdherenceCalendarComponent implements OnInit, OnChanges {
  @Input() windowDays = 30;

  private readonly analysis = inject(AnalysisService);
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

    this.stats = await this.analysis.getAdherenceStats(this.windowDays);
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
