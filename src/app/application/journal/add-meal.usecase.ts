import { inject, Injectable } from '@angular/core';
import type { MealEntity, MealType, MealInputMode, FoodItemVO, AiFodmapAlert } from '../../domain/entities/meal.entity';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import { STORAGE_PORT } from '../tokens';

/**
 * Paramètres requis pour créer un repas.
 *
 * @remarks
 * id et createdAt sont exclus car assignés par le use case.
 * aiFodmapFlags est optionnel : absent si saisie manuelle ou IA sans alertes.
 */
export interface AddMealInput {
  readonly occurredAt: Date;
  readonly type: MealType;
  readonly inputMode: MealInputMode;
  readonly items: ReadonlyArray<FoodItemVO>;
  readonly notes?: string;
  readonly aiFodmapFlags?: ReadonlyArray<AiFodmapAlert>;
}

/**
 * Enregistre un nouveau repas dans le journal quotidien.
 *
 * @remarks
 * Respecte SRP : responsabilité unique de persister un MealEntity.
 * L'id et le timestamp createdAt sont toujours générés ici, jamais par le composant.
 * Mode dégradé : ce use case n'utilise pas de port IA — il fonctionne toujours,
 * y compris sans clé API configurée.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useClass: FakeStorageAdapter }]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class AddMealUseCase {
  private readonly storage = inject<StorageRepository<MealEntity>>(STORAGE_PORT as never);

  /**
   * Crée et persiste un MealEntity avec un UUID et un timestamp générés automatiquement.
   *
   * @param input - Données du repas saisies par l'utilisateur
   * @returns L'identifiant UUID du repas créé
   */
  async execute(input: AddMealInput): Promise<string> {
    const meal: MealEntity = {
      id: crypto.randomUUID(),
      occurredAt: input.occurredAt,
      createdAt: new Date(),
      type: input.type,
      inputMode: input.inputMode,
      items: input.items,
      notes: input.notes,
      aiFodmapFlags: input.aiFodmapFlags,
    };
    return this.storage.save('meals', meal);
  }
}
