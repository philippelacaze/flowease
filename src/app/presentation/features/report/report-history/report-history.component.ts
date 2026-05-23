import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BuildReportUseCase } from '../../../../application/report/build-report.usecase';
import type { ReportEntity } from '../../../../domain/entities/report.entity';
import type { StorageRepository } from '../../../../domain/repositories/storage.repository';
import { STORAGE_PORT } from '../../../../application/tokens';

/**
 * Historique des 20 derniers rapports générés.
 *
 * @remarks
 * Respecte SRP — lecture seule depuis IndexedDB via STORAGE_PORT.
 * La regénération délègue à BuildReportUseCase.
 */
@Component({
  selector: 'app-report-history',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="report-history">
      <header class="page-header">
        <a mat-icon-button routerLink=".." aria-label="Retour au générateur">
          <mat-icon>arrow_back</mat-icon>
        </a>
        <h1>Historique des rapports</h1>
      </header>

      @if (loading()) {
        <div class="loading-state">
          <mat-spinner diameter="40" />
        </div>
      } @else if (reports().length === 0) {
        <div class="empty-state" data-testid="empty-history">
          <mat-icon>description</mat-icon>
          <p>Aucun rapport généré pour l'instant.</p>
          <a mat-stroked-button routerLink="..">Générer un rapport</a>
        </div>
      } @else {
        <mat-list>
          @for (report of reports(); track report.id) {
            <mat-list-item class="report-item" data-testid="report-item">
              <mat-icon matListItemIcon>
                {{ report.format === 'pdf' ? 'picture_as_pdf' : 'article' }}
              </mat-icon>
              <span matListItemTitle>
                {{ report.windowDays }} jours — {{ report.generatedAt | date:'dd/MM/yyyy HH:mm' }}
              </span>
              <span matListItemLine>
                <mat-chip [highlighted]="!!report.aiSummary">
                  {{ report.format === 'pdf' ? 'PDF' : 'Texte' }}
                </mat-chip>
                @if (report.aiSummary) {
                  <mat-chip color="primary">Synthèse IA</mat-chip>
                }
              </span>
              <button
                matListItemMeta
                mat-icon-button
                (click)="onRegenerate(report)"
                [attr.aria-label]="'Regénérer le rapport du ' + (report.generatedAt | date:'dd/MM/yyyy')"
                data-testid="regenerate-btn">
                <mat-icon>refresh</mat-icon>
              </button>
            </mat-list-item>
          }
        </mat-list>
      }
    </div>
  `,
  styles: [`
    .report-history {
      max-width: 640px;
      margin: 0 auto;
      padding: 16px;
    }
    .page-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    .page-header h1 {
      font-size: 1.4rem;
      margin: 0;
    }
    .loading-state {
      display: flex;
      justify-content: center;
      padding: 40px;
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 48px 16px;
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
    }
    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
    }
    .report-item {
      min-height: 72px;
    }
  `],
})
export class ReportHistoryComponent implements OnInit {
  private readonly storage = inject<StorageRepository<ReportEntity>>(STORAGE_PORT as never);
  private readonly buildReport = inject(BuildReportUseCase);
  private readonly snackBar = inject(MatSnackBar);

  protected loading = signal(true);
  protected reports = signal<ReportEntity[]>([]);

  async ngOnInit(): Promise<void> {
    try {
      const all = (await this.storage.getAll('reports')) as ReportEntity[];
      const sorted = all
        .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
        .slice(0, 20);
      this.reports.set(sorted);
    } finally {
      this.loading.set(false);
    }
  }

  protected async onRegenerate(report: ReportEntity): Promise<void> {
    try {
      await this.buildReport.execute({
        windowDays: report.windowDays,
        startDate: new Date(report.startDate),
        endDate: new Date(report.endDate),
        format: report.format,
      });
      this.snackBar.open('Rapport regénéré', 'OK', { duration: 2000 });
      await this.ngOnInit();
    } catch {
      this.snackBar.open('Erreur lors de la regénération', 'OK', { duration: 3000 });
    }
  }
}
