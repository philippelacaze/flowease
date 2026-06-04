/**
 * Entités et value objects du module Coach IA.
 *
 * @remarks
 * Couche Domain pure — zéro import externe. Modélise une conversation
 * avec le coach IA (Claude) : session, messages individuels et résumé
 * de session. Utilisé par CoachRepository et les use cases Coach.
 */

/**
 * Résumé condensé d'une session Coach, généré en fin de session.
 *
 * @remarks
 * Value Object immuable produit par CoachPort.summarizeSession().
 * Stocké dans CoachSessionEntity pour initialiser la session suivante
 * avec le contexte pertinent.
 *
 * @param content - Texte du résumé généré par l'IA
 * @param generatedAt - Horodatage de génération
 * @param tokenCount - Nombre de tokens estimé pour ce résumé
 */
export interface SessionSummaryVO {
  readonly content: string;
  readonly generatedAt: Date;
  readonly tokenCount: number;
}

/** Rôle de l'émetteur d'un message dans la conversation. */
export type MessageRole = 'user' | 'assistant';

/**
 * Représente un message individuel dans une session Coach.
 *
 * @remarks
 * Entité enfant de CoachSessionEntity. Chaque message est immuable
 * après création — pas de modification rétroactive.
 *
 * @param id - Identifiant unique (crypto.randomUUID())
 * @param sessionId - Référence vers la CoachSessionEntity parente
 * @param role - Émetteur du message
 * @param content - Contenu textuel du message
 * @param tokenCount - Estimation du nombre de tokens
 * @param createdAt - Horodatage d'envoi
 */
export interface CoachMessageEntity {
  readonly id: string;
  readonly sessionId: string;
  readonly role: MessageRole;
  readonly content: string;
  readonly tokenCount: number;
  readonly createdAt: Date;
}

/** Fenêtre de contexte données passée au Coach lors du démarrage. */
export type CoachContextWindow =
  | 'today'
  | '7d'
  | '14d'
  | '30d'
  | 'profile_only';

/**
 * Représente une session de conversation avec le Coach IA.
 *
 * @remarks
 * Entité racine du module Coach. Respecte SRP : la logique de streaming
 * appartient à CoachPort, pas à cette entité. CoachSessionEntity stocke
 * uniquement l'état persisté de la conversation.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: COACH_PORT, useClass: NullAiService }]
 * ```
 *
 * @param id - Identifiant unique (crypto.randomUUID())
 * @param contextWindow - Fenêtre de données transmise à l'IA
 * @param messageIds - Identifiants des CoachMessageEntity (ordre chronologique)
 * @param summary - Résumé généré en fin de session (absent si non terminée)
 * @param totalTokens - Cumul des tokens utilisés dans la session
 * @param startedAt - Horodatage de démarrage
 * @param endedAt - Horodatage de fin (absent si en cours)
 */
export interface CoachSessionEntity {
  readonly id: string;
  readonly contextWindow: CoachContextWindow;
  readonly messageIds: readonly string[];
  readonly summary?: SessionSummaryVO;
  readonly totalTokens: number;
  readonly startedAt: Date;
  readonly endedAt?: Date;
}
