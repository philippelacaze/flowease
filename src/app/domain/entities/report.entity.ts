/**
 * Entités et types liés aux rapports médicaux générés.
 *
 * @remarks
 * Couche Domain pure — zéro import externe. Un rapport regroupe
 * plusieurs sections de données (journal, traitements, analyses)
 * en vue d'être partagé avec un professionnel de santé.
 * Utilisé par ReportRepository et les use cases Rapport.
 */

/** Format de sortie du rapport. */
export type ReportFormat = 'pdf' | 'text';

/**
 * Section individuelle d'un rapport médical.
 *
 * @remarks
 * Value Object — chaque section correspond à un bloc de données
 * (ex. "Alimentation", "Symptômes", "Observance"). Ordonné par
 * le use case BuildReportUseCase avant génération.
 *
 * @param key - Identifiant technique de la section
 * @param title - Titre localisé affiché dans le rapport
 * @param content - Contenu formaté (markdown ou texte brut)
 * @param included - Indique si la section est activée par l'utilisateur
 */
export interface ReportSection {
  readonly key: string;
  readonly title: string;
  readonly content: string;
  readonly included: boolean;
}

/**
 * Représente un rapport médical généré et persisté.
 *
 * @remarks
 * Entité racine du module Rapport. La synthèse IA (aiSummary) est
 * optionnelle : elle n'est générée que si l'utilisateur le demande
 * explicitement, pour maîtriser la consommation de tokens.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: REPORT_PORT, useClass: NullAIAdapter }]
 * ```
 *
 * @param id - Identifiant unique (crypto.randomUUID())
 * @param windowDays - Fenêtre temporelle couverte en jours
 * @param startDate - Date de début de la fenêtre
 * @param endDate - Date de fin de la fenêtre
 * @param format - Format de sortie choisi
 * @param sections - Blocs de contenu ordonnés
 * @param aiSummary - Synthèse générée par l'IA (absent si non demandé)
 * @param generatedAt - Horodatage de génération
 */
export interface ReportEntity {
  readonly id: string;
  readonly windowDays: number;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly format: ReportFormat;
  readonly sections: readonly ReportSection[];
  readonly aiSummary?: string;
  readonly generatedAt: Date;
}
