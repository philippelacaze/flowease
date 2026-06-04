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

import { AnalysisService, type TrendData } from '../services/analysis.service';

interface ChartPoint {
  readonly x: number;
  readonly y: number;
  readonly index: number;
}

interface DashedSegment {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

const L = 36;   // left
const R = 312;  // right
const T = 16;   // top
const B = 152;  // bottom
const W = R - L; // chart width  = 276
const H = B - T; // chart height = 136

/**
 * Graphique SVG d'évolution d'un symptôme sur une fenêtre temporelle.
 *
 * @remarks
 * Respecte SRP : visualisation uniquement, sans logique métier.
 * Implémenté en SVG natif (pas de dépendance ng2-charts).
 * Segments continus = trait plein ; segments avec données manquantes = pointillés.
 * Superposition optionnelle d'un second symptôme (coral, tirets) via input secondaryKey.
 */
@Component({
  selector: 'app-symptom-chart',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './symptom-chart.component.html',
  styleUrl: './symptom-chart.component.scss',
})
export class SymptomChartComponent implements OnInit, OnChanges {
  @Input() primaryKey = 'abdominal_pain';
  @Input() secondaryKey: string | null = null;
  @Input() windowDays = 30;

  private readonly analysis = inject(AnalysisService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;

  protected primaryPoints: ChartPoint[] = [];
  protected primarySolidPath = '';
  protected primaryDashedSegs: DashedSegment[] = [];

  protected secondaryPoints: ChartPoint[] = [];
  protected secondarySolidPath = '';
  protected secondaryDashedSegs: DashedSegment[] = [];

  protected get xAxisLabels(): { x: number; label: string }[] {
    const now = new Date();
    const labels: { x: number; label: string }[] = [];
    const step = Math.ceil(this.windowDays / 4);
    for (let i = 0; i <= this.windowDays; i += step) {
      const d = new Date(now);
      d.setDate(d.getDate() - (this.windowDays - i));
      labels.push({
        x: L + (i / this.windowDays) * W,
        label: `${d.getDate()}/${d.getMonth() + 1}`,
      });
    }
    return labels;
  }

  ngOnInit(): void {
    void this.loadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const relevant = changes['windowDays'] || changes['primaryKey'] || changes['secondaryKey'];
    const notFirst = !changes['windowDays']?.firstChange ||
                     !changes['primaryKey']?.firstChange ||
                     !changes['secondaryKey']?.firstChange;
    if (relevant && notFirst) {
      void this.loadData();
    }
  }

  private async loadData(): Promise<void> {
    this.loading = true;
    this.cdr.markForCheck();

    const [primary, secondary] = await Promise.all([
      this.analysis.getSymptomTrends(this.windowDays, this.primaryKey),
      this.secondaryKey
        ? this.analysis.getSymptomTrends(this.windowDays, this.secondaryKey)
        : Promise.resolve<TrendData[]>([]),
    ]);

    this.primaryPoints = this.buildPoints(primary);
    this.primarySolidPath = this.buildSolidPath(this.primaryPoints);
    this.primaryDashedSegs = this.buildDashedSegs(this.primaryPoints);

    this.secondaryPoints = this.buildPoints(secondary);
    this.secondarySolidPath = this.buildSolidPath(this.secondaryPoints);
    this.secondaryDashedSegs = this.buildDashedSegs(this.secondaryPoints);

    this.loading = false;
    this.cdr.markForCheck();
  }

  private buildPoints(trends: TrendData[]): ChartPoint[] {
    const now = new Date();
    const points: ChartPoint[] = [];

    for (let i = 0; i <= this.windowDays; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - (this.windowDays - i));
      const dateStr = d.toISOString().slice(0, 10);
      const trend = trends.find(t => t.date === dateStr);

      if (trend) {
        const x = L + (i / this.windowDays) * W;
        const y = T + ((10 - trend.averageIntensity) / 10) * H;
        points.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, index: i });
      }
    }

    return points;
  }

  private buildSolidPath(points: ChartPoint[]): string {
    if (points.length === 0) return '';

    let path = '';
    let prevIndex = -2;

    for (const p of points) {
      path += p.index !== prevIndex + 1
        ? `M ${p.x} ${p.y} `
        : `L ${p.x} ${p.y} `;
      prevIndex = p.index;
    }

    return path.trim();
  }

  private buildDashedSegs(points: ChartPoint[]): DashedSegment[] {
    const segs: DashedSegment[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      if (points[i + 1].index - points[i].index > 1) {
        segs.push({
          x1: points[i].x, y1: points[i].y,
          x2: points[i + 1].x, y2: points[i + 1].y,
        });
      }
    }
    return segs;
  }
}
