/**
 * Entité profil utilisateur et types associés.
 *
 * @remarks
 * Couche Domain pure — zéro import externe. Stocké via LocalSettingsAdapter
 * (localStorage), pas dans IndexedDB. Utilisé par SaveUserProfileUseCase
 * et injecté dans les prompts du Coach IA pour personnaliser les réponses.
 */

/** Condition médicale déclarée par l'utilisateur. */
export type MedicalCondition =
  | 'sibo_hydrogen'
  | 'sibo_methane'
  | 'sibo_hydrogen_sulfide'
  | 'gastroparesis'
  | 'ibs'
  | 'crohn'
  | 'colitis'
  | 'gerd'
  | 'other';

/** Niveau de régime FODMAP suivi. */
export type FodmapProtocol =
  | 'strict'
  | 'reintroduction'
  | 'maintenance'
  | 'none';

/** Langue d'interface préférée. */
export type AppLanguage = 'fr' | 'en';

/** Thème visuel de l'application. */
export type AppTheme = 'auto' | 'light' | 'dark';

/**
 * Profil médical et préférences de l'utilisateur.
 *
 * @remarks
 * Value Object persisté tel quel dans localStorage. Toutes les
 * propriétés sont optionnelles car l'utilisateur peut configurer
 * l'app progressivement. Le Coach IA exploite conditions et protocol
 * pour adapter ses recommandations.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useClass: FakeStorageAdapter }]
 * ```
 *
 * @param firstName - Prénom de l'utilisateur
 * @param conditions - Conditions médicales déclarées
 * @param protocol - Protocole alimentaire en cours
 * @param diagnosedAt - Date de diagnostic
 * @param otherConditions - Autres conditions médicales (texte libre)
 * @param referringDoctor - Nom du médecin référent (optionnel)
 * @param allergies - Allergies connues (texte libre)
 * @param dietaryRestrictions - Restrictions alimentaires spécifiques (texte libre)
 * @param language - Langue de l'interface
 * @param theme - Thème visuel
 * @param showTokenCounter - Affiche le compteur de tokens Coach
 * @param defaultCoachContext - Fenêtre de contexte par défaut pour le Coach
 * @param updatedAt - Dernière mise à jour du profil
 */
export interface UserProfileEntity {
  readonly id: string;
  readonly firstName?: string;
  readonly conditions: readonly MedicalCondition[];
  readonly protocol: FodmapProtocol;
  readonly diagnosedAt?: Date;
  readonly otherConditions?: string;
  readonly referringDoctor?: string;
  readonly allergies?: string;
  readonly dietaryRestrictions?: string;
  readonly language: AppLanguage;
  readonly theme: AppTheme;
  readonly showTokenCounter: boolean;
  readonly defaultCoachContext: string;
  readonly updatedAt: Date;
}
