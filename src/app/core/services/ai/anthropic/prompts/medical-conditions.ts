/**
 * Libellés des conditions médicales et description pour les prompts IA.
 *
 * @remarks
 * Source unique de vérité pour transformer les codes de conditions
 * (`MedicalCondition`) en libellés lisibles dans les prompts. Évite de
 * coder en dur « SIBO » / « gastroparésie » : chaque prompt reprend les
 * conditions réellement sélectionnées par l'utilisateur (Paramètres →
 * Mon profil), y compris le texte libre « Autres conditions ».
 */
import type { MedicalCondition, FodmapProtocol } from '../../../../models/entities/user-profile.entity';

/** Libellés français des conditions médicales connues. */
export const CONDITION_LABELS: Record<MedicalCondition, string> = {
  sibo_hydrogen: 'SIBO à hydrogène',
  sibo_methane: 'SIBO au méthane',
  sibo_hydrogen_sulfide: 'SIBO à hydrogène sulfuré',
  gastroparesis: 'gastroparésie',
  ibs: 'syndrome de l\'intestin irritable (SII)',
  crohn: 'maladie de Crohn',
  colitis: 'recto-colite hémorragique',
  gerd: 'RGO (reflux gastro-œsophagien)',
};

/** Libellés français des protocoles FODMAP. */
export const PROTOCOL_LABELS: Record<Exclude<FodmapProtocol, 'none'>, string> = {
  strict: 'régime FODMAP strict',
  reintroduction: 'phase de réintroduction FODMAP',
  maintenance: 'phase de maintenance FODMAP',
};

/** Formulation neutre employée quand aucune condition n'est renseignée. */
export const FALLBACK_CONDITIONS = 'troubles digestifs et nutritionnels';

/**
 * Décrit le protocole FODMAP suivi sous forme lisible.
 *
 * @param protocol - Code de protocole du profil ('strict', 'none', etc.)
 * @returns Libellé lisible, ou « Non renseigné » si aucun protocole actif
 */
export function describeProtocol(protocol: string): string {
  return PROTOCOL_LABELS[protocol as keyof typeof PROTOCOL_LABELS] ?? 'Non renseigné';
}

/**
 * Décrit les conditions du patient sous forme de liste lisible.
 *
 * @param conditions - Codes de conditions sélectionnés dans le profil
 * @param otherConditions - Texte libre « Autres conditions » (optionnel)
 * @returns Liste séparée par des virgules, ou une formulation neutre si vide
 */
export function describeConditions(
  conditions: readonly string[],
  otherConditions?: string,
): string {
  const labels = conditions.map(c => CONDITION_LABELS[c as MedicalCondition] ?? c).filter(Boolean);
  const other = otherConditions?.trim();
  if (other) labels.push(other);
  return labels.length > 0 ? labels.join(', ') : FALLBACK_CONDITIONS;
}
