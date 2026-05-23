/**
 * Entités et types liés aux cures de traitement (protocoles multi-semaines).
 *
 * @remarks
 * Couche Domain pure — zéro import externe. Une CureEntity représente
 * un protocole complet (ex. cure d'antibiotiques SIBO sur 14 jours)
 * regroupant plusieurs TreatmentEntity. Utilisé par CureRepository.
 */

/** Statut du cycle de vie d'une cure. */
export type CureStatus =
  | 'planned'
  | 'active'
  | 'paused'
  | 'completed'
  | 'abandoned';

/**
 * Représente un protocole de traitement sur une durée définie.
 *
 * @remarks
 * Agrège plusieurs traitements sous un protocole médical unique.
 * Respecte ISP : CureRepository ne manipule que CureEntity,
 * sans accéder aux détails des TreatmentEntity enfants.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useClass: FakeStorageAdapter }]
 * ```
 *
 * @param id - Identifiant unique (crypto.randomUUID())
 * @param name - Nom de la cure (ex. "Rifaximin SIBO Round 1")
 * @param treatmentIds - Identifiants des TreatmentEntity inclus
 * @param status - Statut courant de la cure
 * @param durationDays - Durée prévue en jours
 * @param startedAt - Date de début effective
 * @param endedAt - Date de fin effective (absent si non terminée)
 * @param notes - Observations libres
 * @param createdAt - Date de création de l'entrée
 */
export interface CureEntity {
  readonly id: string;
  readonly name: string;
  readonly treatmentIds: readonly string[];
  readonly status: CureStatus;
  readonly durationDays: number;
  readonly startedAt: Date;
  readonly endedAt?: Date;
  readonly notes: string;
  readonly createdAt: Date;
}
