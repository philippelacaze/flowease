/**
 * Prompt A.1 — Analyse d'une photo de repas.
 *
 * @remarks
 * Utilisé par AiService.analyzeMealPhoto().
 * Le prompt est généré dynamiquement selon le profil médical du patient.
 * La réponse attendue est un objet JSON { items, fodmapAlerts }.
 */
import type { MealProfileContext } from '../../../../models/entities/user-profile.entity';
import { CONDITION_LABELS, PROTOCOL_LABELS } from './medical-conditions';

function buildPersona(ctx: MealProfileContext): string {
  const labels = ctx.conditions.map(c => CONDITION_LABELS[c]).filter(Boolean);
  const protoPart = ctx.protocol !== 'none' && PROTOCOL_LABELS[ctx.protocol]
    ? `, suivant un ${PROTOCOL_LABELS[ctx.protocol]}`
    : '';

  if (labels.length === 0) {
    return ctx.protocol !== 'none'
      ? `Tu es un nutritionniste expert en régime FODMAP${protoPart}.`
      : 'Tu es un nutritionniste expert en nutrition digestive.';
  }
  return `Tu es un nutritionniste expert en nutrition digestive pour patients atteints de ${labels.join(', ')}${protoPart}.`;
}

function buildAlertRules(ctx: MealProfileContext): string {
  const hasSibo = ctx.conditions.some(c => c.startsWith('sibo'));
  const hasGastro = ctx.conditions.includes('gastroparesis');
  const hasIbs = ctx.conditions.includes('ibs');
  const hasCrohn = ctx.conditions.includes('crohn');
  const hasColitis = ctx.conditions.includes('colitis');
  const hasGerd = ctx.conditions.includes('gerd');

  const reasonParts: string[] = [];
  if (hasSibo) reasonParts.push('SIBO : expliquer le risque de fermentation rapide et de pullulation bactérienne');
  if (hasGastro) reasonParts.push('Gastroparésie : expliquer l\'impact sur la vidange gastrique et la tolérance digestive');
  if (hasIbs) reasonParts.push('SII : expliquer la sensibilité intestinale et les symptômes déclencheurs');
  if (hasCrohn) reasonParts.push('Crohn : expliquer le risque d\'inflammation ou d\'irritation intestinale');
  if (hasColitis) reasonParts.push('Colite : expliquer le risque d\'irritation du côlon');
  if (hasGerd) reasonParts.push('RGO : expliquer le risque de reflux ou d\'acidité');

  const reasonRule = reasonParts.length > 0
    ? `- Adapter la raison médicale au profil du patient : ${reasonParts.join(' ; ')}`
    : '- Donne une raison nutritionnelle précise et utile pour le patient';

  const extraRules: string[] = [];
  if (ctx.allergies) {
    extraRules.push(`- Signaler également tout aliment pouvant contenir : ${ctx.allergies} (allergies connues du patient)`);
  }
  if (ctx.dietaryRestrictions) {
    extraRules.push(`- Tenir compte des restrictions alimentaires : ${ctx.dietaryRestrictions}`);
  }

  return [
    '- Inclure uniquement les aliments avec fodmap.level "medium" (severity: "warning") ou "high" (severity: "danger")',
    reasonRule,
    ...extraRules,
    '- Si aucun aliment problématique, retourne fodmapAlerts: []',
  ].join('\n');
}

function buildPatientContext(ctx: MealProfileContext): string {
  const lines: string[] = [];
  if (ctx.otherConditions) lines.push(`Autres conditions : ${ctx.otherConditions}`);
  return lines.length > 0 ? `\nContexte patient supplémentaire :\n${lines.join('\n')}\n` : '';
}

/** Construit le prompt photo adapté au profil médical du patient. */
export function buildMealPhotoPrompt(ctx: MealProfileContext): string {
  return `${buildPersona(ctx)}
${buildPatientContext(ctx)}
Analyse cette photo de repas et identifie chaque aliment visible.

Retourne UNIQUEMENT un objet JSON valide, sans texte avant ni après, avec ce format exact :
{
  "items": [
    {
      "name": "nom de l'aliment en français",
      "quantity": "quantité estimée (ex: 200g, 1 portion, 1 bol)",
      "fodmap": { "level": "low" },
      "confirmed": false
    }
  ],
  "fodmapAlerts": [
    {
      "item": "nom de l'aliment problématique",
      "reason": "raison médicale précise",
      "severity": "warning"
    }
  ]
}

Les valeurs possibles pour fodmap.level sont : "low", "medium", "high", "unknown".
Les valeurs possibles pour severity sont : "warning" (niveau medium) et "danger" (niveau high).

Règles pour items :
- confirmed est toujours false (l'utilisateur valide ensuite)
- fodmap.level basé sur les guidelines Monash University 2024
- Si tu n'es pas certain d'un aliment, inclus-le avec fodmap.level "unknown"
- Estime les quantités visuellement
- Inclure les sauces, huiles, assaisonnements visibles
- Si la photo ne montre pas de repas, retourne items: []

Règles pour fodmapAlerts :
${buildAlertRules(ctx)}`;
}
