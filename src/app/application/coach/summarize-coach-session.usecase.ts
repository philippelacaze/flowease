import { Injectable, inject } from '@angular/core';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import type { CoachPort, CoachMessage } from '../../domain/repositories/ai/coach.port';
import type { SessionSummaryVO } from '../../domain/entities/coach-session.entity';
import { STORAGE_PORT, COACH_PORT } from '../tokens';
import type { StoredCoachSession } from './coach-session.types';

/**
 * Génère un résumé de la session Coach et clôture la session.
 *
 * @remarks
 * Respecte SRP : résumé + clôture de session uniquement.
 * Le résumé est persisté dans la session pour initialiser la prochaine.
 * Mode dégradé : retourne null si CoachPort retourne null — jamais throw.
 * La session est marquée comme terminée (endedAt) même en mode dégradé.
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
export class SummarizeCoachSessionUseCase {
  private readonly storage = inject<StorageRepository<StoredCoachSession>>(STORAGE_PORT as never);
  private readonly coachPort = inject<CoachPort>(COACH_PORT as never);

  /**
   * Génère et persiste le résumé de la session, puis la clôture.
   *
   * @param sessionId - Identifiant de la session à résumer
   * @returns Texte du résumé, ou null si IA indisponible
   */
  async execute(sessionId: string): Promise<string | null> {
    const session = await this.storage.get('coach-sessions', sessionId) as StoredCoachSession | undefined;
    if (!session) return null;

    const history: CoachMessage[] = session.messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    const summaryText = await this.coachPort.summarizeSession(history);

    const summary: SessionSummaryVO | undefined = summaryText
      ? {
          content: summaryText,
          generatedAt: new Date(),
          tokenCount: Math.ceil(summaryText.length / 4),
        }
      : undefined;

    await this.storage.save('coach-sessions', {
      ...session,
      summary,
      endedAt: new Date(),
    });

    return summaryText;
  }
}
