/**
 * Statut de prise d'un traitement.
 *
 * @remarks
 * Discriminant utilisé par ConfirmIntakeUseCase pour enregistrer l'observance.
 * 'taken' = pris, 'skipped' = sauté volontairement.
 */
export type IntakeStatus = 'taken' | 'skipped';

/**
 * Raison motivant le saut d'une prise de traitement.
 *
 * @remarks
 * Value object optionnel dans IntakeEntity pour comprendre les patterns de non-observance.
 */
export type SkipReason =
  | 'forgot'
  | 'side_effects'
  | 'deliberate_choice'
  | 'out_of_stock'
  | 'felt_better'
  | 'other';

/**
 * Entité représentant la confirmation de prise (ou saut) d'un traitement.
 *
 * @remarks
 * Interface readonly — jamais de mutation directe.
 * id et confirmedAt sont assignés par ConfirmIntakeUseCase.
 * Un IntakeEntity est créé à chaque tap sur un traitement dans IntakeEntryComponent.
 *
 * @param id - UUID v4 assigné par crypto.randomUUID()
 * @param treatmentId - Référence au TreatmentEntity concerné
 * @param scheduledAt - Heure théorique prévue par le protocole
 * @param confirmedAt - Heure effective de confirmation par l'utilisateur
 * @param createdAt - Timestamp d'enregistrement
 * @param status - 'taken' si pris, 'skipped' si sauté
 * @param skipReason - Raison du saut (uniquement si status === 'skipped')
 * @param actualDose - Dose réellement prise si différente de la dose prescrite
 * @param notes - Note libre
 */
export interface IntakeEntity {
  readonly id: string;
  readonly treatmentId: string;
  readonly scheduledAt: Date;
  readonly confirmedAt: Date;
  readonly createdAt: Date;
  readonly status: IntakeStatus;
  readonly skipReason?: SkipReason;
  readonly actualDose?: string;
  readonly notes?: string;
}
