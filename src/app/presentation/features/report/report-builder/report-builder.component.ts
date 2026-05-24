import { Component, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { BuildReportUseCase } from '../../../../application/report/build-report.usecase';
import { GenerateReportSummaryUseCase } from '../../../../application/report/generate-report-summary.usecase';
import type { ReportEntity, ReportFormat } from '../../../../domain/entities/report.entity';
import type { ReportData } from '../../../../domain/repositories/ai/report.port';

type WindowPreset = 7 | 14 | 30 | 90;

/**
 * Page principale de génération de rapport médical.
 *
 * @remarks
 * Respecte SRP — orchestre uniquement BuildReportUseCase et
 * GenerateReportSummaryUseCase. La génération PDF est assurée
 * par downloadAsPdf() côté présentation uniquement.
 */
@Component({
  selector: 'app-report-builder',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule
],
  templateUrl: './report-builder.component.html',
  styleUrl: './report-builder.component.scss',
})
export class ReportBuilderComponent {
  private readonly buildReport = inject(BuildReportUseCase);
  private readonly generateSummary = inject(GenerateReportSummaryUseCase);
  private readonly snackBar = inject(MatSnackBar);

  protected windowPreset: WindowPreset | 0 = 14;
  protected format: ReportFormat = 'text';
  protected includeAiSummary = false;
  protected customStart: Date | null = null;
  protected customEnd: Date | null = null;

  protected generating = signal(false);
  protected generatedReport = signal<ReportEntity | null>(null);
  protected aiSummaryText = signal<string | null>(null);

  protected onPresetChange(value: WindowPreset | 0): void {
    if (value !== 0) {
      this.customStart = null;
      this.customEnd = null;
    }
  }

  protected isRangeValid(): boolean {
    if (this.windowPreset !== 0) return true;
    return this.customStart !== null && this.customEnd !== null &&
      this.customStart <= (this.customEnd ?? this.customStart);
  }

  protected async onGenerate(): Promise<void> {
    if (!this.isRangeValid() || this.generating()) return;

    this.generating.set(true);
    this.generatedReport.set(null);
    this.aiSummaryText.set(null);

    try {
      const { startDate, endDate, windowDays } = this.computeRange();

      const report = await this.buildReport.execute({
        windowDays,
        startDate,
        endDate,
        format: this.format,
      });

      this.generatedReport.set(report);

      if (this.includeAiSummary) {
        const reportData: ReportData = {
          windowDays,
          sections: report.sections.filter(s => s.included),
          userConditions: [],
        };
        const summary = await this.generateSummary.execute(report.id, reportData);
        this.aiSummaryText.set(summary);
      }

      this.snackBar.open('Rapport généré', 'OK', { duration: 2000 });
    } catch {
      this.snackBar.open('Erreur lors de la génération', 'OK', { duration: 3000 });
    } finally {
      this.generating.set(false);
    }
  }

  protected downloadAsPdf(): void {
    const report = this.generatedReport();
    if (!report) return;

    const text = this.buildTextContent(report);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flowease-rapport-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  protected async copyForDoctor(): Promise<void> {
    const report = this.generatedReport();
    if (!report) return;

    const text = this.buildTextContent(report);
    await navigator.clipboard.writeText(text);
    this.snackBar.open('Copié dans le presse-papiers', 'OK', { duration: 2000 });
  }

  private computeRange(): { startDate: Date; endDate: Date; windowDays: number } {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    if (this.windowPreset !== 0) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - this.windowPreset);
      startDate.setHours(0, 0, 0, 0);
      return { startDate, endDate, windowDays: this.windowPreset };
    }

    const startDate = new Date(this.customStart!);
    startDate.setHours(0, 0, 0, 0);
    const customEnd = new Date(this.customEnd!);
    customEnd.setHours(23, 59, 59, 999);
    const windowDays = Math.round(
      (customEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    return { startDate, endDate: customEnd, windowDays };
  }

  private buildTextContent(report: ReportEntity): string {
    const lines: string[] = [
      `RAPPORT FLOWEASE — ${new Date(report.generatedAt).toLocaleDateString('fr-FR')}`,
      `Période : ${report.windowDays} jours`,
      '',
    ];

    const summary = this.aiSummaryText();
    if (summary) {
      lines.push('=== SYNTHÈSE IA ===', summary, '');
    }

    for (const section of report.sections) {
      if (section.included) {
        lines.push(`=== ${section.title.toUpperCase()} ===`, section.content, '');
      }
    }

    return lines.join('\n');
  }
}
