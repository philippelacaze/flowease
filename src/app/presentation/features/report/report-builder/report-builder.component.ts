import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
    CommonModule,
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
    MatDividerModule,
  ],
  template: `
    <div class="report-builder">
      <header class="page-header">
        <h1>Rapport médical</h1>
        <a mat-icon-button routerLink="history" aria-label="Historique des rapports">
          <mat-icon>history</mat-icon>
        </a>
      </header>

      <!-- Sélecteur fenêtre temporelle -->
      <section class="section">
        <h2 class="section-title">Période</h2>
        <mat-button-toggle-group
          [(ngModel)]="windowPreset"
          aria-label="Fenêtre temporelle"
          class="window-toggle"
          (ngModelChange)="onPresetChange($event)">
          <mat-button-toggle [value]="7" data-testid="window-7">7 jours</mat-button-toggle>
          <mat-button-toggle [value]="14" data-testid="window-14">14 jours</mat-button-toggle>
          <mat-button-toggle [value]="30" data-testid="window-30">30 jours</mat-button-toggle>
          <mat-button-toggle [value]="90" data-testid="window-90">90 jours</mat-button-toggle>
          <mat-button-toggle [value]="0" data-testid="window-custom">Personnalisé</mat-button-toggle>
        </mat-button-toggle-group>

        @if (windowPreset === 0) {
          <div class="custom-range">
            <mat-form-field appearance="outline">
              <mat-label>Date de début</mat-label>
              <input
                matInput
                [matDatepicker]="startPicker"
                [(ngModel)]="customStart"
                aria-label="Date de début de la période"
                data-testid="custom-start-date" />
              <mat-datepicker-toggle matSuffix [for]="startPicker" />
              <mat-datepicker #startPicker />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Date de fin</mat-label>
              <input
                matInput
                [matDatepicker]="endPicker"
                [(ngModel)]="customEnd"
                aria-label="Date de fin de la période"
                data-testid="custom-end-date" />
              <mat-datepicker-toggle matSuffix [for]="endPicker" />
              <mat-datepicker #endPicker />
            </mat-form-field>
          </div>
        }
      </section>

      <mat-divider />

      <!-- Sélecteur format -->
      <section class="section">
        <h2 class="section-title">Format</h2>
        <mat-button-toggle-group
          [(ngModel)]="format"
          aria-label="Format du rapport"
          class="format-toggle">
          <mat-button-toggle value="text" data-testid="format-text">
            <mat-icon>article</mat-icon>
            Texte
          </mat-button-toggle>
          <mat-button-toggle value="pdf" data-testid="format-pdf">
            <mat-icon>picture_as_pdf</mat-icon>
            PDF
          </mat-button-toggle>
        </mat-button-toggle-group>
      </section>

      <mat-divider />

      <!-- Option synthèse IA -->
      <section class="section">
        <mat-checkbox
          [(ngModel)]="includeAiSummary"
          data-testid="ai-summary-checkbox"
          aria-label="Inclure une synthèse IA">
          Synthèse IA (Claude)
        </mat-checkbox>

        @if (includeAiSummary) {
          <p class="token-warning" role="status" data-testid="token-warning">
            <mat-icon class="warn-icon">info</mat-icon>
            Consomme environ 2 000 tokens — votre clé Anthropic est requise.
          </p>
        }
      </section>

      <mat-divider />

      <!-- Bouton générer -->
      <section class="section actions">
        <button
          mat-raised-button
          color="primary"
          (click)="onGenerate()"
          [disabled]="generating() || !isRangeValid()"
          aria-label="Générer le rapport"
          data-testid="generate-button"
          class="generate-btn">
          @if (generating()) {
            <mat-spinner diameter="20" />
            Génération en cours…
          } @else {
            <mat-icon>summarize</mat-icon>
            Générer le rapport
          }
        </button>
      </section>

      <!-- Résultat texte -->
      @if (generatedReport()) {
        <section class="result-section" data-testid="report-result">
          <h2 class="section-title">Rapport généré</h2>

          @if (aiSummaryText()) {
            <div class="ai-summary" data-testid="ai-summary">
              <h3>Synthèse IA</h3>
              <pre class="summary-text">{{ aiSummaryText() }}</pre>
            </div>
            <mat-divider />
          }

          <div class="report-sections">
            @for (section of generatedReport()!.sections; track section.key) {
              @if (section.included) {
                <div class="report-section">
                  <h3>{{ section.title }}</h3>
                  <pre class="section-content">{{ section.content }}</pre>
                </div>
              }
            }
          </div>

          <div class="result-actions">
            @if (format === 'pdf') {
              <button
                mat-stroked-button
                (click)="downloadAsPdf()"
                aria-label="Télécharger le rapport en PDF"
                data-testid="download-pdf">
                <mat-icon>download</mat-icon>
                Télécharger PDF
              </button>
            }
            <button
              mat-stroked-button
              (click)="copyForDoctor()"
              aria-label="Copier le rapport pour mon médecin"
              data-testid="copy-report">
              <mat-icon>content_copy</mat-icon>
              Copier pour mon médecin
            </button>
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .report-builder {
      max-width: 640px;
      margin: 0 auto;
      padding: 16px;
    }
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .page-header h1 {
      font-size: 1.5rem;
      margin: 0;
    }
    .section {
      padding: 16px 0;
    }
    .section-title {
      font-size: 1rem;
      font-weight: 500;
      margin: 0 0 12px;
      color: var(--mat-sys-on-surface-variant);
    }
    .window-toggle, .format-toggle {
      flex-wrap: wrap;
      gap: 4px;
    }
    .custom-range {
      display: flex;
      gap: 12px;
      margin-top: 12px;
      flex-wrap: wrap;
    }
    .custom-range mat-form-field {
      flex: 1;
      min-width: 140px;
    }
    .token-warning {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 8px 0 0;
      font-size: 0.85rem;
      color: var(--mat-sys-on-surface-variant);
    }
    .warn-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .actions {
      display: flex;
      justify-content: center;
    }
    .generate-btn {
      min-width: 200px;
      min-height: 48px;
    }
    .result-section {
      margin-top: 24px;
      padding: 16px;
      border-radius: 8px;
      background: var(--mat-sys-surface-container);
    }
    .ai-summary {
      margin-bottom: 16px;
    }
    .summary-text, .section-content {
      white-space: pre-wrap;
      font-family: inherit;
      font-size: 0.9rem;
      margin: 8px 0;
    }
    .report-section {
      margin-bottom: 16px;
    }
    .report-section h3 {
      font-size: 0.95rem;
      font-weight: 600;
      margin: 0 0 4px;
    }
    .result-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 16px;
    }
  `],
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
