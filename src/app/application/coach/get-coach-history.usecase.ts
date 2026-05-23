import { Injectable, inject } from '@angular/core';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import { STORAGE_PORT } from '../tokens';
import type { StoredCoachSession } from './coach-session.types';

/**
 * Récupère toutes les sessions Coach passées triées par date décroissante.
 *
 * @remarks
 * Respecte SRP : lecture de l'historique uniquement — pas de modification.
 * Utilisé par CoachHistoryComponent pour afficher les sessions passées.
 * La suppression globale est aussi exposée ici car elle concerne le même store.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useValue: mockStorage }]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class GetCoachHistoryUseCase {
  private readonly storage = inject<StorageRepository<StoredCoachSession>>(STORAGE_PORT as never);

  /**
   * Retourne toutes les sessions triées par date décroissante.
   *
   * @returns Liste des sessions Coach, tableau vide si aucune
   */
  async execute(): Promise<StoredCoachSession[]> {
    const sessions = await this.storage.getAll('coach-sessions');
    return [...sessions].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );
  }

  /**
   * Supprime toutes les sessions Coach du store.
   */
  async deleteAll(): Promise<void> {
    await this.storage.clear('coach-sessions');
  }
}
