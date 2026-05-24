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
  templateUrl: './report-history.component.html',
  styleUrl: './report-history.component.scss',
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
