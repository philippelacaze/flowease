/**
 * Niveau FODMAP d'un aliment.
 *
 * @remarks
 * Value object pur utilisé dans FoodItemVO pour qualifier la teneur en FODMAPs.
 * Principe ISP : ce type est indépendant de toute logique de repas.
 */
export type FodmapLevel = 'low' | 'medium' | 'high' | 'unknown';

/**
 * Indique si un niveau FODMAP est potentiellement dangereux pour un patient SIBO.
 *
 * @param level - Le niveau FODMAP à évaluer
 * @returns true si le niveau est 'high'
 */
export function isFodmapDangerous(level: FodmapLevel): boolean {
  return level === 'high';
}

/**
 * Retourne un rang numérique pour trier les aliments par niveau FODMAP.
 *
 * @param level - Le niveau FODMAP à convertir
 * @returns 0 pour 'low', 1 pour 'medium', 2 pour 'high', -1 pour 'unknown'
 */
export function fodmapRank(level: FodmapLevel): number {
  const ranks: Record<FodmapLevel, number> = {
    low: 0,
    medium: 1,
    high: 2,
    unknown: -1,
  };
  return ranks[level];
}
