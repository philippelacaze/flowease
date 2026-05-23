import { inject, Injectable } from '@angular/core';
import type { FoodItemVO, MealEntity } from '../../domain/entities/meal.entity';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import { STORAGE_PORT } from '../tokens';

/**
 * Calcule les aliments les plus fréquemment consommés depuis l'historique.
 *
 * @remarks
 * Respecte SRP : responsabilité unique d'agréger la fréquence des aliments.
 * Utilisé par MealEntryComponent en mode "Récurrents" pour proposer les aliments
 * habituels sans saisie manuelle. Seuls les aliments confirmed = true sont comptés.
 * Mode dégradé : aucune dépendance IA — retourne toujours les données locales.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useClass: FakeStorageAdapter }]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class GetFrequentFoodsUseCase {
  private readonly storage = inject<StorageRepository<MealEntity>>(STORAGE_PORT as never);

  /**
   * Parcourt l'historique des repas et retourne les aliments les plus fréquents.
   *
   * @param limit - Nombre maximum d'aliments à retourner (défaut : 20)
   * @returns Liste de FoodItemVO triée par fréquence décroissante
   */
  async execute(limit = 20): Promise<FoodItemVO[]> {
    const meals = await this.storage.getAll('meals') as MealEntity[];
    const frequency = new Map<string, { item: FoodItemVO; count: number }>();

    for (const meal of meals) {
      for (const item of meal.items) {
        if (!item.confirmed) continue;
        const existing = frequency.get(item.name);
        if (existing) {
          existing.count++;
        } else {
          frequency.set(item.name, { item, count: 1 });
        }
      }
    }

    return Array.from(frequency.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(e => e.item);
  }
}
