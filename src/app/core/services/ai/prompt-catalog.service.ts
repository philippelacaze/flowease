import { Injectable, inject } from '@angular/core';
import { StorageService } from '../storage.service';
import type {
  MealProfileContext,
  UserProfileEntity,
} from '../../models/entities/user-profile.entity';
import type { TreatmentEntity } from '../../models/entities/treatment.entity';
import { buildMealPhotoPrompt } from './anthropic/prompts/meal-photo.prompt';
import { buildMealTextPrompt } from './anthropic/prompts/meal-text.prompt';
import { NOTE_TAGGING_PROMPT } from './anthropic/prompts/note-tagging.prompt';
import { ANALYSIS_PROMPT } from './anthropic/prompts/analysis.prompt';
import { REPORT_SUMMARY_PROMPT } from './anthropic/prompts/report-summary.prompt';
import { COACH_SYSTEM_PROMPT } from './anthropic/prompts/coach-system.prompt';
import { describeConditions, describeProtocol } from './anthropic/prompts/medical-conditions';

/** Jeton injecté dans les patterns de prompt à la place des données runtime. */
const USER_TEXT_PLACEHOLDER = '{{DESCRIPTION_UTILISATEUR}}';

/**
 * Un prompt IA résolu, prêt à être affiché en lecture seule.
 *
 * @remarks
 * `resolved` distingue les prompts entièrement construits selon le profil
 * (analyse de repas) des patterns dont les placeholders `{{...}}` issus des
 * données runtime (journal, saisie) sont remplis au moment de l'appel API.
 */
export interface ResolvedPrompt {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly resolved: boolean;
  readonly placeholders: readonly string[];
  readonly text: string;
}

/**
 * Catalogue des prompts IA utilisés par l'application, résolus à la demande.
 *
 * @remarks
 * Principe SRP : agrège les prompts dispersés dans `ai/anthropic/prompts/`
 * et les expose sous une forme unique pour l'affichage de débogage de la
 * page IA.
 *
 * Toutes les données **déjà disponibles côté Paramètres** (conditions, protocole,
 * traitements actifs, détails médicaux du profil) sont injectées à la place de
 * leur placeholder. Seuls les placeholders alimentés par les données runtime
 * (journal, contenu saisi, fenêtre d'analyse, session précédente) restent
 * affichés tels quels.
 *
 * Prévu pour évoluer : une future version permettra de surcharger ces prompts
 * et de stocker la version personnalisée en base.
 */
@Injectable({ providedIn: 'root' })
export class PromptCatalogService {
  private readonly storage = inject(StorageService);

  /**
   * Résout l'intégralité des prompts IA dans leur ordre d'affichage.
   *
   * @returns La liste des prompts résolus (jamais null)
   */
  async resolveAll(): Promise<ResolvedPrompt[]> {
    const profile = await this.storage.get<UserProfileEntity>('user-profile', 'singleton');
    const treatments = await this.storage.getAll<TreatmentEntity>('treatments');

    const ctx = toMealProfileContext(profile);
    const conditions = describeConditions(ctx.conditions, ctx.otherConditions);
    const protocol = describeProtocol(profile?.protocol ?? 'none');
    const activeTreatments = treatments.filter(t => t.active).map(t => t.name).join(', ') || 'Aucun';
    const medicalDetails = buildMedicalDetails(profile);

    // Données issues des Paramètres : injectées telles quelles dans la page.
    const withSettings = (template: string): string =>
      template
        .replace(/\{\{CONDITIONS\}\}/g, conditions)
        .replace(/\{\{PROTOCOL\}\}/g, protocol)
        .replace(/\{\{TREATMENTS\}\}/g, activeTreatments)
        .replace(/\{\{MEDICAL_DETAILS\}\}/g, medicalDetails);

    return [
      this.make(
        'meal_photo',
        'Analyse photo de repas (A.1)',
        'Identifie les aliments d\'une photo. Résolu selon votre profil médical.',
        buildMealPhotoPrompt(ctx),
        true,
      ),
      this.make(
        'meal_text',
        'Analyse repas (texte / vocal) (A.2)',
        'Extrait les aliments d\'une description. Résolu selon votre profil médical.',
        buildMealTextPrompt(ctx, USER_TEXT_PLACEHOLDER),
        true,
      ),
      this.make(
        'note_tagging',
        'Taguage de note (A.3)',
        'Génère tags et résumé court d\'une note du journal.',
        withSettings(NOTE_TAGGING_PROMPT),
        false,
      ),
      this.make(
        'analysis',
        'Analyse de tendances (A.4)',
        'Corrélations, patterns et recommandations sur une fenêtre de jours.',
        withSettings(ANALYSIS_PROMPT),
        false,
      ),
      this.make(
        'report_summary',
        'Synthèse de rapport (A.5)',
        'Synthèse narrative markdown d\'un rapport médical.',
        withSettings(REPORT_SUMMARY_PROMPT),
        false,
      ),
      this.make(
        'coach_system',
        'Coach IA — system prompt (A.8)',
        'Cadre la conversation du Coach et injecte le contexte patient.',
        withSettings(COACH_SYSTEM_PROMPT),
        false,
      ),
    ];
  }

  private make(
    id: string,
    label: string,
    description: string,
    text: string,
    resolved: boolean,
  ): ResolvedPrompt {
    return { id, label, description, resolved, placeholders: extractPlaceholders(text), text };
  }
}

/** Dérive le contexte d'analyse de repas depuis le profil utilisateur. */
function toMealProfileContext(profile: UserProfileEntity | undefined): MealProfileContext {
  return {
    conditions: profile?.conditions ?? [],
    protocol: profile?.protocol ?? 'none',
    allergies: profile?.allergies,
    dietaryRestrictions: profile?.dietaryRestrictions,
    otherConditions: profile?.otherConditions,
  };
}

/** Construit le bloc « détails médicaux » du profil (vide si aucun détail). */
function buildMedicalDetails(profile: UserProfileEntity | undefined): string {
  if (!profile) return '';
  const parts: string[] = [];
  if (profile.diagnosedAt) parts.push(`Diagnostic : ${new Date(profile.diagnosedAt).toLocaleDateString('fr-FR')}`);
  if (profile.referringDoctor) parts.push(`Médecin référent : ${profile.referringDoctor}`);
  if (profile.otherConditions) parts.push(`Autres conditions : ${profile.otherConditions}`);
  if (profile.allergies) parts.push(`Allergies : ${profile.allergies}`);
  if (profile.dietaryRestrictions) parts.push(`Restrictions alimentaires : ${profile.dietaryRestrictions}`);
  return parts.join('\n');
}

/** Extrait les placeholders `{{...}}` distincts d'un texte, dans l'ordre d'apparition. */
function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{\{[A-Z0-9_]+\}\}/g) ?? [];
  return [...new Set(matches)];
}
