import { Injectable, inject } from '@angular/core';
import type { ReportPort, ReportData } from '../../domain/repositories/ai/report.port';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import type { ReportEntity } from '../../domain/entities/report.entity';
import { REPORT_PORT, STORAGE_PORT } from '../tokens';

/**
 * Génère la synthèse IA d'un rapport et met à jour l'entité persistée.
 *
 * @remarks
 * Respecte SRP : délègue uniquement la génération de texte au ReportPort.
 * Mode dégradé : retourne null si le port retourne null — jamais throw.
 * La synthèse n'est pas requise pour qu'un rapport soit valide.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [
 *   { provide: REPORT_PORT, useClass: NullAIAdapter },
 *   { provide: STORAGE_PORT, useValue: mockStorage },
 * ]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class GenerateReportSummaryUseCase {
  private readonly reportPort = inject<ReportPort>(REPORT_PORT as never);
  private readonly storage = inject<StorageRepository<ReportEntity>>(STORAGE_PORT as never);

  /**
   * Appelle le port IA et persiste la synthèse dans le rapport existant.
   *
   * @param reportId - Identifiant du rapport à enrichir
   * @param reportData - Données à transmettre au port IA
   * @returns Synthèse en markdown, ou null si IA indisponible
   */
  async execute(reportId: string, reportData: ReportData): Promise<string | null> {
    const summary = await this.reportPort.generateReportSummary(reportData);
    if (!summary) return null;

    const report = await this.storage.get('reports', reportId);
    if (report) {
      await this.storage.save('reports', { ...report, aiSummary: summary });
    }

    return summary;
  }
}
