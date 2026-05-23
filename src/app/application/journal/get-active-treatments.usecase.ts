import { inject, Injectable } from '@angular/core';
import type { TreatmentEntity } from '../../domain/entities/treatment.entity';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import { STORAGE_PORT } from '../tokens';

/**
 * Retourne la liste des traitements actuellement actifs.
 *
 * @remarks
 * Respecte SRP : responsabilité unique de filtrer les traitements actifs.
 * Utilisé par IntakeEntryComponent pour afficher la liste des prises du jour.
 * Mode dégradé : aucune dépendance IA — retourne toujours les données locales.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useClass: FakeStorageAdapter }]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class GetActiveTreatmentsUseCase {
  private readonly storage = inject<StorageRepository<TreatmentEntity>>(STORAGE_PORT as never);

  /**
   * Charge tous les traitements et filtre ceux dont active === true.
   *
   * @returns Liste des TreatmentEntity actifs, triée par nom
   */
  async execute(): Promise<TreatmentEntity[]> {
    const all = await this.storage.getAll('treatments') as TreatmentEntity[];
    return all
      .filter(t => t.active)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}
