/**
 * Type de selle selon l'échelle de Bristol (1 à 7).
 *
 * @remarks
 * Value object utilisé dans StoolEntry pour classifier le transit intestinal.
 * L'échelle de Bristol est l'outil clinique standard pour évaluer la consistance des selles.
 * Types 3-4 sont considérés comme normaux ; 1-2 indiquent constipation, 5-7 diarrhée.
 */
export type BristolType = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Descriptions FR/EN pour chaque type de l'échelle de Bristol.
 *
 * @remarks
 * Utilisé par BristolScaleComponent pour afficher la description sous chaque icône.
 */
export const BRISTOL_DESCRIPTIONS: ReadonlyArray<{
  readonly type: BristolType;
  readonly labelFr: string;
  readonly labelEn: string;
}> = [
  { type: 1, labelFr: 'Morceaux durs séparés', labelEn: 'Separate hard lumps' },
  { type: 2, labelFr: 'En forme de saucisse, bosselé', labelEn: 'Lumpy sausage shape' },
  { type: 3, labelFr: 'Saucisse avec craquelures', labelEn: 'Sausage with cracks' },
  { type: 4, labelFr: 'Saucisse lisse et molle', labelEn: 'Smooth soft sausage' },
  { type: 5, labelFr: 'Morceaux mous aux bords nets', labelEn: 'Soft blobs, clear edges' },
  { type: 6, labelFr: 'Morceaux floconneux, bouillie', labelEn: 'Fluffy, mushy pieces' },
  { type: 7, labelFr: 'Entièrement liquide', labelEn: 'Entirely liquid' },
] as const;
