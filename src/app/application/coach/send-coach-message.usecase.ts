import { Injectable, inject } from '@angular/core';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import type { CoachPort, CoachMessage, CoachContext } from '../../domain/repositories/ai/coach.port';
import type { CoachMessageEntity } from '../../domain/entities/coach-session.entity';
import { STORAGE_PORT, COACH_PORT } from '../tokens';
import type { StoredCoachSession } from './coach-session.types';

/** Paramètres requis pour envoyer un message au Coach. */
export interface SendCoachMessageInput {
  readonly sessionId: string;
  readonly userMessage: string;
  readonly history: readonly CoachMessage[];
  readonly context: CoachContext;
}

/**
 * Envoie un message au Coach IA et stream la réponse token par token.
 *
 * @remarks
 * Respecte SRP : envoi + sauvegarde du message uniquement.
 * Le use case est un générateur asynchrone : yield pour chaque token reçu,
 * puis persiste le message assistant complet après la fin du stream.
 * Mode dégradé : CoachPort retourne un itérable vide — le message assistant
 * est sauvegardé avec content vide, sans exception levée.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [
 *   { provide: COACH_PORT, useClass: NullAIAdapter },
 *   { provide: STORAGE_PORT, useValue: mockStorage },
 * ]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class SendCoachMessageUseCase {
  private readonly storage = inject<StorageRepository<StoredCoachSession>>(STORAGE_PORT as never);
  private readonly coachPort = inject<CoachPort>(COACH_PORT as never);

  /**
   * Persiste le message utilisateur, stream la réponse IA, persiste la réponse.
   *
   * @param input - Message, historique et contexte de la session
   * @yields Tokens de la réponse du Coach au fur et à mesure
   */
  async *execute(input: SendCoachMessageInput): AsyncGenerator<string> {
    const session = await this.storage.get('coach-sessions', input.sessionId) as StoredCoachSession | undefined;
    if (!session) return;

    const userMsg: CoachMessageEntity = {
      id: crypto.randomUUID(),
      sessionId: input.sessionId,
      role: 'user',
      content: input.userMessage,
      tokenCount: Math.ceil(input.userMessage.length / 4),
      createdAt: new Date(),
    };

    const sessionWithUser: StoredCoachSession = {
      ...session,
      messages: [...session.messages, userMsg],
    };
    await this.storage.save('coach-sessions', sessionWithUser);

    const stream = this.coachPort.sendMessage(input.userMessage, input.history, input.context);
    let fullResponse = '';

    for await (const token of stream) {
      fullResponse += token;
      yield token;
    }

    const assistantMsg: CoachMessageEntity = {
      id: crypto.randomUUID(),
      sessionId: input.sessionId,
      role: 'assistant',
      content: fullResponse,
      tokenCount: Math.ceil(fullResponse.length / 4),
      createdAt: new Date(),
    };

    const userTokens = userMsg.tokenCount;
    const assistantTokens = assistantMsg.tokenCount;

    await this.storage.save('coach-sessions', {
      ...sessionWithUser,
      messages: [...sessionWithUser.messages, assistantMsg],
      totalTokens: session.totalTokens + userTokens + assistantTokens,
    });
  }
}
