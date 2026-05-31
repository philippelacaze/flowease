import { inject, Injectable } from '@angular/core';
import type { CureEntity } from '../../domain/entities/cure.entity';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import { STORAGE_PORT } from '../tokens';

/**
 * Progression d'une cure active pour l'affichage dans le journal.
 *
 * @remarks
 * Value object immuable calculé à la volée par GetActiveCuresUseCase.
 * Expose uniquement les données nécessaires au rendu — pas l'entité brute.
 */
export interface CureProgressVO {
  readonly id: string;
  readonly name: string;
  readonly currentDay: number;
  readonly totalDays: number;
  readonly progressPercent: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Retourne les cures actuellement actives avec leur progression calculée,
 * et clôture automatiquement celles dont la durée est dépassée.
 *
 * @remarks
 * Respecte SRP : une responsabilité — fournir la progression des cures du jour.
 * La clôture automatique évite qu'une cure périmée reste en status 'active'
 * sans qu'aucun composant de gestion des cures ne soit ouvert.
 * Mode dégradé : aucune dépendance IA — toujours opérationnel offline.
 */
@Injectable({ providedIn: 'root' })
export class GetActiveCuresUseCase {
  private readonly storage = inject<StorageRepository<CureEntity>>(STORAGE_PORT as never);

  /**
   * Calcule la progression de chaque cure active pour la date du jour.
   * Clôture automatiquement les cures dont la durée est dépassée.
   *
   * @returns Liste des CureProgressVO pour les cures en cours aujourd'hui
   */
  async execute(): Promise<CureProgressVO[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const all = await this.storage.getAll('cures') as CureEntity[];
    const result: CureProgressVO[] = [];

    for (const cure of all) {
      if (cure.status !== 'active') continue;

      const startDay = new Date(cure.startedAt);
      startDay.setHours(0, 0, 0, 0);

      const dayIndex = Math.floor((today.getTime() - startDay.getTime()) / MS_PER_DAY);

      if (dayIndex < 0) continue;

      if (dayIndex >= cure.durationDays) {
        const completed: CureEntity = { ...cure, status: 'completed', endedAt: new Date() };
        await this.storage.save('cures', completed);
        continue;
      }

      const currentDay = dayIndex + 1;
      result.push({
        id: cure.id,
        name: cure.name,
        currentDay,
        totalDays: cure.durationDays,
        progressPercent: Math.round((currentDay / cure.durationDays) * 100),
      });
    }

    return result;
  }
}
