import type { FodmapLevel } from '../value-objects/fodmap-level.vo';

/**
 * Mode de saisie d'un repas par l'utilisateur.
 *
 * @remarks
 * Discriminant permettant d'identifier l'origine de la saisie pour l'analyse et les stats.
 */
export type MealInputMode = 'text' | 'voice' | 'photo' | 'recurring';

/**
 * Type de repas dans la journée.
 *
 * @remarks
 * Utilisé pour regrouper les repas et calculer les statistiques d'observance du protocole.
 */
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/**
 * Indicateur FODMAP associé à un aliment.
 *
 * @remarks
 * Value object imbriqué dans FoodItemVO pour qualifier la dangerosité potentielle.
 */
export interface FodmapFlagVO {
  readonly level: FodmapLevel;
  readonly detail?: string;
}

/**
 * Aliment individuel au sein d'un repas.
 *
 * @remarks
 * Value object immuable. confirmed = false indique une suggestion IA non encore validée.
 * L'interface ISP garantit que ce VO est utilisable indépendamment de MealEntity.
 */
export interface FoodItemVO {
  readonly name: string;
  readonly quantity?: string;
  readonly unit?: string;
  readonly fodmap: FodmapFlagVO;
  readonly confirmed: boolean;
}

/**
 * Alerte FODMAP contextuelle générée par l'IA au niveau du repas.
 *
 * @remarks
 * Distincte du niveau par aliment (FodmapFlagVO) : l'IA explique ici pourquoi
 * un aliment est problématique pour ce patient (SIBO, gastroparésie).
 * Stockée dans MealEntity.aiFodmapFlags après analyse du repas.
 *
 * @param item - Nom de l'aliment incriminé
 * @param reason - Raison médicale précise (ex : "Contient des fructanes")
 * @param severity - "warning" pour FODMAP medium, "danger" pour FODMAP high
 */
export interface AiFodmapAlert {
  readonly item: string;
  readonly reason: string;
  readonly severity: 'warning' | 'danger';
}

/**
 * Entité représentant un repas saisi dans le journal quotidien.
 *
 * @remarks
 * Interface readonly — jamais de mutation directe, toujours recréer l'entité.
 * id et occurredAt sont assignés par le use case AddMealUseCase, jamais par le composant.
 *
 * @param id - UUID v4 assigné par crypto.randomUUID() dans AddMealUseCase
 * @param occurredAt - Heure effective du repas (modifiable par l'utilisateur avant validation)
 * @param createdAt - Timestamp de création de l'enregistrement
 * @param type - Type de repas (breakfast, lunch, dinner, snack)
 * @param inputMode - Canal de saisie (text, voice, photo, recurring)
 * @param items - Liste des aliments composant le repas
 * @param notes - Note libre optionnelle associée au repas
 * @param aiFodmapFlags - Alertes FODMAP contextuelles générées par l'IA (optionnel)
 */
export interface MealEntity {
  readonly id: string;
  readonly occurredAt: Date;
  readonly createdAt: Date;
  readonly type: MealType;
  readonly inputMode: MealInputMode;
  readonly items: ReadonlyArray<FoodItemVO>;
  readonly notes?: string;
  readonly aiFodmapFlags?: ReadonlyArray<AiFodmapAlert>;
}
