/**
 * Zone abdominale identifiable sur la cartographie corporelle.
 *
 * @remarks
 * Value object utilisé dans SymptomEntity pour localiser les douleurs.
 * Correspond aux 6 zones standard de l'examen clinique abdominal.
 */
export type AbdominalZone =
  | 'epigastric'
  | 'hypochondre_left'
  | 'hypochondre_right'
  | 'periumbilical'
  | 'iliac_left'
  | 'iliac_right';

/**
 * Ensemble des 6 zones abdominales avec leurs labels FR/EN.
 *
 * @remarks
 * Utilisé par AbdominalMapComponent pour générer les zones tappables du SVG.
 */
export const ABDOMINAL_ZONES: ReadonlyArray<{
  readonly id: AbdominalZone;
  readonly labelFr: string;
  readonly labelEn: string;
}> = [
  { id: 'epigastric', labelFr: 'Épigastre', labelEn: 'Epigastric' },
  { id: 'hypochondre_left', labelFr: 'Hypocondre gauche', labelEn: 'Left hypochondrium' },
  { id: 'hypochondre_right', labelFr: 'Hypocondre droit', labelEn: 'Right hypochondrium' },
  { id: 'periumbilical', labelFr: 'Péri-ombilical', labelEn: 'Periumbilical' },
  { id: 'iliac_left', labelFr: 'Fosse iliaque gauche', labelEn: 'Left iliac fossa' },
  { id: 'iliac_right', labelFr: 'Fosse iliaque droite', labelEn: 'Right iliac fossa' },
] as const;
