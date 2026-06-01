import { inject, Injectable } from '@angular/core';
import type { CureEntity } from '../../domain/entities/cure.entity';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import { STORAGE_PORT } from '../tokens';

/** Données saisies par l'utilisateur pour créer une cure. */
export interface CreateCureInput {
  readonly name: string;
  readonly treatmentIds: readonly string[];
  readonly durationDays: number;
  readonly startedAt: Date;
  readonly notes: string;
}

/**
 * Crée une nouvelle cure dans le store IndexedDB.
 *
 * @remarks
 * Respecte SRP — une responsabilité : persister une CureEntity avec status 'active'.
 * La cure est immédiatement active dès sa création (pas de statut 'planned'
 * dans ce flux — le statut planned est réservé aux cures créées en avance).
 * Mode dégradé : aucune dépendance IA — toujours opérationnel offline.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useValue: mockStorage }]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class CreateCureUseCase {
  private readonly storage = inject<StorageRepository<CureEntity>>(STORAGE_PORT as never);

  /**
   * Persiste une nouvelle CureEntity avec un UUID généré côté client.
   *
   * @param input - Données de la cure à créer
   * @returns L'entité créée
   */
  async execute(input: CreateCureInput): Promise<CureEntity> {
    const cure: CureEntity = {
      id: crypto.randomUUID(),
      name: input.name,
      treatmentIds: input.treatmentIds,
      status: 'active',
      durationDays: input.durationDays,
      startedAt: input.startedAt,
      notes: input.notes,
      createdAt: new Date(),
    };
    await this.storage.save('cures', cure);
    return cure;
  }
}
