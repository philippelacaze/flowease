/**
 * Entités et types liés aux traitements et rappels médicamenteux.
 *
 * @remarks
 * Couche Domain pure — zéro import externe. Représente un traitement
 * prescrit (médicament, complément, protocole) avec sa configuration
 * de rappel. Utilisé par TreatmentRepository et les use cases Journal.
 */

/** Catégorie du traitement selon sa nature thérapeutique. */
export type TreatmentCategory =
  | 'antibiotic'
  | 'probiotic'
  | 'prokinetic'
  | 'antispasmodic'
  | 'supplement'
  | 'enzyme'
  | 'other';

/** Mode d'administration du traitement. */
export type TreatmentMode =
  | 'oral'
  | 'sublingual'
  | 'topical'
  | 'injectable'
  | 'inhaled';

/**
 * Configuration du rappel quotidien pour un traitement.
 *
 * @remarks
 * Stocké tel quel dans IndexedDB. Les heures sont des chaînes "HH:MM"
 * locales — la conversion en Date se fait au moment de l'affichage.
 */
export interface ReminderConfig {
  readonly enabled: boolean;
  /** Heures de rappel au format "HH:MM". */
  readonly times: readonly string[];
  readonly soundEnabled: boolean;
}

/**
 * Représente un traitement prescrit ou auto-administré.
 *
 * @remarks
 * Entité racine du module Traitement. Suit ISP : IntakeRepository et
 * TreatmentRepository utilisent chacun une projection de cette entité.
 *
 * @param id - Identifiant unique (crypto.randomUUID())
 * @param name - Nom du médicament ou complément
 * @param category - Catégorie thérapeutique
 * @param mode - Voie d'administration
 * @param dosage - Dose par prise (ex. "500mg")
 * @param unit - Unité de la dose
 * @param frequency - Nombre de prises par jour
 * @param reminder - Configuration des rappels
 * @param notes - Observations libres du patient
 * @param active - Indique si le traitement est en cours
 * @param startedAt - Date de début
 * @param endedAt - Date de fin (absent si en cours)
 * @param createdAt - Date de création de l'entrée
 */
export interface TreatmentEntity {
  readonly id: string;
  readonly name: string;
  readonly category: TreatmentCategory;
  readonly mode: TreatmentMode;
  readonly dosage: string;
  readonly unit: string;
  readonly frequency: number;
  readonly reminder: ReminderConfig;
  readonly notes: string;
  readonly active: boolean;
  readonly startedAt: Date;
  readonly endedAt?: Date;
  readonly createdAt: Date;
}
