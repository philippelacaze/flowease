import type { AbdominalZone } from '../value-objects/pain-location.vo';
import type { PainType } from '../value-objects/pain-type.vo';
import type { BristolType } from '../value-objects/bristol-type.vo';

/**
 * Catégorie de symptôme pour le regroupement dans l'interface.
 *
 * @remarks
 * Permet d'afficher les symptômes en 3 blocs distincts dans SymptomEntryComponent.
 */
export type SymptomCategory = 'digestive' | 'systemic' | 'wellbeing';

/**
 * Entrée de transit dans un journal de symptômes.
 *
 * @remarks
 * Value object imbriqué dans SymptomEntity. bristolType null = transit non renseigné.
 * blood et mucus déclenchent une alerte médicale en UI si positifs (§1.4.4).
 */
export interface StoolEntry {
  readonly bristolType: BristolType | null;
  readonly count?: number;
  readonly notes?: string;
  readonly blood?: boolean;
  readonly mucus?: boolean;
  readonly frequency?: number;
}

/**
 * Événement gazeux consigné lors d'une saisie de symptômes.
 *
 * @remarks
 * Value object imbriqué dans SymptomEntity pour suivi des flatulences.
 */
export interface GasEvent {
  readonly intensity: number;
  readonly notes?: string;
}

/**
 * Entité représentant une saisie de symptômes dans le journal quotidien.
 *
 * @remarks
 * Interface readonly — jamais de mutation directe.
 * id et occurredAt sont assignés par AddSymptomUseCase.
 * intensity est sur une échelle de 1 à 10 (compatible IntensitySliderComponent).
 *
 * @param id - UUID v4 assigné par crypto.randomUUID()
 * @param occurredAt - Horodatage de la saisie
 * @param createdAt - Timestamp d'enregistrement
 * @param category - Catégorie du symptôme (digestive, systemic, wellbeing)
 * @param symptomKey - Identifiant technique du symptôme (ex: 'abdominal_pain')
 * @param intensity - Intensité de 1 à 10
 * @param painZones - Zones abdominales concernées (si applicable)
 * @param painTypes - Types de douleur ressentis (si applicable)
 * @param stool - Données de transit (si applicable)
 * @param gas - Données gazeuses (si applicable)
 * @param notes - Note libre
 */
export interface SymptomEntity {
  readonly id: string;
  readonly occurredAt: Date;
  readonly createdAt: Date;
  readonly category: SymptomCategory;
  readonly symptomKey: string;
  readonly intensity: number;
  readonly painZones?: ReadonlyArray<AbdominalZone>;
  readonly painTypes?: ReadonlyArray<PainType>;
  readonly stool?: StoolEntry;
  readonly gas?: GasEvent;
  readonly notes?: string;
}
