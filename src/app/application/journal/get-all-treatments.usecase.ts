import { inject, Injectable } from '@angular/core';
import type { TreatmentEntity } from '../../domain/entities/treatment.entity';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import { STORAGE_PORT } from '../tokens';

/**
 * Retourne tous les traitements, actifs ou non.
 *
 * @remarks
 * Respecte SRP : responsabilité unique de charger l'ensemble des traitements sans filtre.
 * Distinct de GetActiveTreatmentsUseCase qui filtre sur active === true.
 * Utilisé pour construire des maps id → name dans les vues de journal,
 * afin d'afficher le nom même pour des prises liées à un traitement désactivé.
 */
@Injectable({ providedIn: 'root' })
export class GetAllTreatmentsUseCase {
  private readonly storage = inject<StorageRepository<TreatmentEntity>>(STORAGE_PORT as never);

  /**
   * Charge tous les traitements sans filtre, triés par nom.
   *
   * @returns Liste complète des TreatmentEntity, actifs et inactifs
   */
  async execute(): Promise<TreatmentEntity[]> {
    const all = await this.storage.getAll('treatments') as TreatmentEntity[];
    return all.sort((a, b) => a.name.localeCompare(b.name));
  }
}
