import { Injectable, inject } from '@angular/core';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import type { CoachContextWindow } from '../../domain/entities/coach-session.entity';
import { STORAGE_PORT } from '../tokens';
import type { StoredCoachSession } from './coach-session.types';

/** Résultat du démarrage d'une nouvelle session Coach. */
export interface StartCoachSessionResult {
  readonly sessionId: string;
  readonly contextWindow: CoachContextWindow;
  readonly previousSummary?: string;
}

/**
 * Crée une nouvelle session de conversation avec le Coach IA.
 *
 * @remarks
 * Respecte SRP : initialisation de session uniquement — pas d'envoi de message.
 * Charge le résumé de la session précédente pour initialiser le contexte Coach.
 * La session est créée sans messages (tableau vide) et sans date de fin.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useValue: mockStorage }]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class StartCoachSessionUseCase {
  private readonly storage = inject<StorageRepository<StoredCoachSession>>(STORAGE_PORT as never);

  /**
   * Crée et persiste une nouvelle session, récupère le résumé de la précédente.
   *
   * @param contextWindow - Fenêtre de données à transmettre au Coach
   * @returns Identifiant de la nouvelle session et résumé précédent si disponible
   */
  async execute(contextWindow: CoachContextWindow): Promise<StartCoachSessionResult> {
    const previousSummary = await this.loadPreviousSummary();

    const session: StoredCoachSession = {
      id: crypto.randomUUID(),
      contextWindow,
      messages: [],
      totalTokens: 0,
      startedAt: new Date(),
    };

    await this.storage.save('coach-sessions', session);

    return { sessionId: session.id, contextWindow, previousSummary };
  }

  private async loadPreviousSummary(): Promise<string | undefined> {
    const allSessions = await this.storage.getAll('coach-sessions');
    const withSummary = allSessions
      .filter(s => s.summary !== undefined)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    return withSummary[0]?.summary?.content;
  }
}
