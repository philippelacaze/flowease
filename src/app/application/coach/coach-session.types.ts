import type {
  CoachMessageEntity,
  CoachContextWindow,
  SessionSummaryVO,
} from '../../domain/entities/coach-session.entity';

/**
 * Représentation stockée d'une session Coach avec messages inline.
 *
 * @remarks
 * Les messages sont dénormalisés dans le store 'coach-sessions' car
 * IndexedDB ne dispose pas d'un store séparé pour les messages.
 * messageIds de CoachSessionEntity est dérivé de messages.map(m => m.id).
 */
export interface StoredCoachSession {
  readonly id: string;
  readonly contextWindow: CoachContextWindow;
  readonly messages: readonly CoachMessageEntity[];
  readonly summary?: SessionSummaryVO;
  readonly totalTokens: number;
  readonly startedAt: Date;
  readonly endedAt?: Date;
}
