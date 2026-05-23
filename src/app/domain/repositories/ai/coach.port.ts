import type { CoachContextWindow } from '../../entities/coach-session.entity';

/**
 * Message transmis au port Coach pour constituer l'historique de conversation.
 *
 * @remarks
 * Value Object reflétant le format attendu par l'API Anthropic Messages.
 */
export interface CoachMessage {
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

/**
 * Contexte complet transmis au Coach IA lors d'une session.
 *
 * @remarks
 * Assemblé par SendCoachMessageUseCase à partir du profil utilisateur,
 * de la session en cours et des données de santé agrégées.
 */
export interface CoachContext {
  readonly contextWindow: CoachContextWindow;
  readonly userConditions: readonly string[];
  readonly protocol: string;
  readonly activeTreatments: readonly string[];
  readonly previousSessionSummary?: string;
  readonly healthDataJson?: string;
}

/**
 * Port de conversation avec le coach IA (streaming).
 *
 * @remarks
 * Respecte ISP : deux responsabilités distinctes — envoi de message
 * (streaming) et résumé de session (une seule fois par session).
 * Implémenté par AnthropicAdapter (fetch SSE) et NullAIAdapter.
 * sendMessage() utilise AsyncIterable pour le streaming token par token.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: COACH_PORT, useClass: NullAIAdapter }]
 * ```
 */
export interface CoachPort {
  /**
   * Envoie un message au coach et stream la réponse token par token.
   *
   * @param message - Message de l'utilisateur
   * @param history - Historique des messages de la session courante
   * @param context - Contexte de données de santé à fournir au coach
   * @returns AsyncIterable émettant les tokens de la réponse au fur et à mesure,
   *          ou un itérable vide si l'IA est indisponible
   */
  sendMessage(
    message: string,
    history: readonly CoachMessage[],
    context: CoachContext,
  ): AsyncIterable<string>;

  /**
   * Génère un résumé condensé de la session pour initialiser la prochaine.
   *
   * @param messages - Tous les messages de la session à résumer
   * @returns Résumé textuel de la session, ou null si IA indisponible
   */
  summarizeSession(messages: readonly CoachMessage[]): Promise<string | null>;
}
