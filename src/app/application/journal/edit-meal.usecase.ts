import { inject, Injectable } from '@angular/core';
import type { MealEntity, MealType, MealInputMode, FoodItemVO, AiFodmapAlert } from '../../domain/entities/meal.entity';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import { STORAGE_PORT } from '../tokens';

/**
 * Paramètres requis pour modifier un repas existant.
 *
 * @remarks
 * id identifie l'entité à mettre à jour. createdAt est préservé depuis l'existant.
 */
export interface EditMealInput {
  readonly id: string;
  readonly occurredAt: Date;
  readonly type: MealType;
  readonly inputMode: MealInputMode;
  readonly items: ReadonlyArray<FoodItemVO>;
  readonly notes?: string;
  readonly aiFodmapFlags?: ReadonlyArray<AiFodmapAlert>;
}

/**
 * Met à jour un repas existant dans le journal quotidien.
 *
 * @remarks
 * Respecte SRP : responsabilité unique de modifier un MealEntity existant.
 * Préserve id et createdAt depuis l'entité originale. Ajoute editedAt.
 * Si l'id n'existe pas, ne fait rien (idempotent).
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useValue: mockStorage }]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class EditMealUseCase {
  private readonly storage = inject<StorageRepository<MealEntity>>(STORAGE_PORT as never);

  /**
   * Récupère le repas existant et le remplace par la version mise à jour.
   *
   * @param input - Données modifiées du repas
   * @returns void — silencieux si l'id est introuvable
   */
  async execute(input: EditMealInput): Promise<void> {
    const existing = await this.storage.get('meals', input.id);
    if (!existing) return;
    const updated: MealEntity = {
      ...existing,
      occurredAt: input.occurredAt,
      type: input.type,
      inputMode: input.inputMode,
      items: input.items,
      notes: input.notes,
      aiFodmapFlags: input.aiFodmapFlags,
      editedAt: new Date(),
    };
    await this.storage.save('meals', updated);
  }
}
