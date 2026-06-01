import { inject, Injectable } from '@angular/core';
import type { CureEntity } from '../../domain/entities/cure.entity';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import { STORAGE_PORT } from '../tokens';

/**
 * Retourne toutes les cures enregistrées, triées par date de début décroissante.
 *
 * @remarks
 * Respecte SRP — lecture seule du store 'cures'.
 * Utilisé par TreatmentsComponent pour afficher la liste complète des cures
 * (actives, terminées, planifiées). Distinct de GetActiveCuresUseCase qui ne
 * retourne que les cures en cours avec leur progression.
 * Mode dégradé : aucune dépendance IA — toujours opérationnel offline.
 */
@Injectable({ providedIn: 'root' })
export class GetCuresUseCase {
  private readonly storage = inject<StorageRepository<CureEntity>>(STORAGE_PORT as never);

  /**
   * Charge toutes les cures du store, triées de la plus récente à la plus ancienne.
   *
   * @returns Tableau de CureEntity trié par startedAt décroissant
   */
  async execute(): Promise<CureEntity[]> {
    const all = await this.storage.getAll('cures') as CureEntity[];
    return all.sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );
  }
}
