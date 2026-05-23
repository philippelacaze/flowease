import type { ReportSection } from '../../entities/report.entity';

/**
 * Données transmises au port pour la génération de la synthèse IA du rapport.
 *
 * @remarks
 * Value Object assemblé par GenerateReportSummaryUseCase. Contient
 * uniquement les sections activées (included === true).
 */
export interface ReportData {
  readonly sections: readonly ReportSection[];
  readonly windowDays: number;
  readonly userConditions: readonly string[];
}

/**
 * Port de génération de la synthèse médicale par intelligence artificielle.
 *
 * @remarks
 * Respecte ISP : responsabilité unique — génère uniquement le résumé
 * textuel du rapport, pas le rapport complet. Implémenté par
 * AnthropicAdapter et NullAIAdapter.
 * Retourne null si l'IA est indisponible — jamais throw.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: REPORT_PORT, useClass: NullAIAdapter }]
 * ```
 */
export interface ReportPort {
  /**
   * Génère une synthèse narrative du rapport médical.
   *
   * @param data - Données du rapport à synthétiser
   * @returns Synthèse textuelle en markdown, ou null si IA indisponible
   */
  generateReportSummary(data: ReportData): Promise<string | null>;
}
