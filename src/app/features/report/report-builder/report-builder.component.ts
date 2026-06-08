import { Component, inject, signal } from '@angular/core';

import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReportService } from '../services/report.service';
import { PdfReportService } from '../../../core/services/pdf-report.service';
import { StorageService } from '../../../core/services/storage.service';
import type { ReportEntity, ReportFormat } from '../../../core/models/entities/report.entity';
import type { ReportData } from '../../../core/services/ai.service';
import type { UserProfileEntity } from '../../../core/models/entities/user-profile.entity';

type WindowPreset = 7 | 14 | 30 | 90 | 'custom';

/**
 * Page principale de génération de rapport médical.
 *
 * @remarks
 * Respecte SRP — orchestre uniquement BuildReportUseCase et
 * GenerateReportSummaryUseCase. La génération PDF est assurée
 * par downloadAsPdf() côté présentation uniquement.
 * Les sélecteurs de fenêtre et de format utilisent des boutons natifs
 * (pas MatButtonToggle/MatCheckbox) pour alléger la dépendance Material.
 */
@Component({
  selector: 'app-report-builder',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './report-builder.component.html',
  styleUrl: './report-builder.component.scss',
})
export class ReportBuilderComponent {
  private readonly report = inject(ReportService);
  private readonly pdfService = inject(PdfReportService);
  private readonly storage = inject(StorageService);
  private readonly snackBar = inject(MatSnackBar);

  protected windowPreset: WindowPreset = 14;
  protected customStartDate = '';
  protected customEndDate = '';
  protected format: ReportFormat = 'text';
  protected includeAiSummary = false;

  protected generating = signal(false);
  protected generatedReport = signal<ReportEntity | null>(null);
  protected aiSummaryText = signal<string | null>(null);

  protected readonly formats = [
    { value: 'text' as ReportFormat, icon: '📄', label: 'Texte' },
    { value: 'pdf'  as ReportFormat, icon: '📑', label: 'PDF' },
  ] as const;

  protected setWindowPreset(d: number | 'custom'): void {
    this.windowPreset = d as WindowPreset;
  }

  protected isRangeValid(): boolean {
    if (this.windowPreset !== 'custom') return true;
    if (!this.customStartDate || !this.customEndDate) return false;
    const start = new Date(this.customStartDate);
    const end = new Date(this.customEndDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 0 && diffDays <= 365;
  }

  protected get windowLabel(): string {
    if (this.windowPreset === 'custom') {
      if (this.customStartDate && this.customEndDate) {
        return `${this.customStartDate} → ${this.customEndDate}`;
      }
      return 'Personnalisée';
    }
    return `${this.windowPreset} j`;
  }

  protected async onGenerate(): Promise<void> {
    if (!this.isRangeValid() || this.generating()) return;

    this.generating.set(true);
    this.generatedReport.set(null);
    this.aiSummaryText.set(null);

    try {
      const { startDate, endDate, windowDays } = this.computeRange();

      const report = await this.report.build({
        windowDays,
        startDate,
        endDate,
        format: this.format,
      });

      this.generatedReport.set(report);

      if (this.includeAiSummary) {
        const profile = await this.storage.get('user-profile', 'singleton') as UserProfileEntity | undefined;
        const reportData: ReportData = {
          windowDays,
          sections: report.sections.filter(s => s.included),
          userConditions: profile?.conditions ?? [],
          otherConditions: profile?.otherConditions,
          allergies: profile?.allergies,
          dietaryRestrictions: profile?.dietaryRestrictions,
        };
        const summary = await this.report.generateSummary(report.id, reportData);
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
    this.pdfService.generate(report, this.aiSummaryText());
  }

  protected downloadAsText(): void {
    const report = this.generatedReport();
    if (!report) return;

    const text = this.buildTextContent(report);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FlowEase_rapport_${new Date().toISOString().slice(0, 10)}.txt`;
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
    if (this.windowPreset === 'custom') {
      const startDate = new Date(this.customStartDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(this.customEndDate);
      endDate.setHours(23, 59, 59, 999);
      const windowDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      return { startDate, endDate, windowDays };
    }
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - this.windowPreset);
    startDate.setHours(0, 0, 0, 0);
    return { startDate, endDate, windowDays: this.windowPreset };
  }

  private buildTextContent(report: ReportEntity): string {
    const periodeLabel = this.windowPreset === 'custom'
      ? `du ${this.customStartDate} au ${this.customEndDate}`
      : `${report.windowDays} jours`;
    const lines: string[] = [
      `RAPPORT FLOWEASE — ${new Date(report.generatedAt).toLocaleDateString('fr-FR')}`,
      `Période : ${periodeLabel}`,
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
