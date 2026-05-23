/**
 * Type de douleur abdominale ressenti par le patient.
 *
 * @remarks
 * Value object utilisé dans SymptomEntity pour qualifier la nature de la douleur.
 * Permet l'analyse de corrélations par type de douleur sur la durée.
 */
export type PainType =
  | 'cramping'
  | 'bloating'
  | 'burning'
  | 'pressure'
  | 'stabbing'
  | 'nausea';

/**
 * Descripteurs FR/EN pour chaque type de douleur.
 *
 * @remarks
 * Utilisé par SymptomEntryComponent pour afficher les options de sélection multiple.
 */
export const PAIN_TYPES: ReadonlyArray<{
  readonly id: PainType;
  readonly labelFr: string;
  readonly labelEn: string;
}> = [
  { id: 'cramping', labelFr: 'Crampes', labelEn: 'Cramping' },
  { id: 'bloating', labelFr: 'Ballonnements', labelEn: 'Bloating' },
  { id: 'burning', labelFr: 'Brûlures', labelEn: 'Burning' },
  { id: 'pressure', labelFr: 'Pression', labelEn: 'Pressure' },
  { id: 'stabbing', labelFr: 'Douleur en coup de poignard', labelEn: 'Stabbing' },
  { id: 'nausea', labelFr: 'Nausée', labelEn: 'Nausea' },
] as const;
