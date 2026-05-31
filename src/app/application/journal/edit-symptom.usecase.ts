import { inject, Injectable } from '@angular/core';
import type {
  SymptomEntity,
  SymptomCategory,
  StoolEntry,
  GasEvent,
} from '../../domain/entities/symptom.entity';
import type { AbdominalZone } from '../../domain/value-objects/pain-location.vo';
import type { PainType } from '../../domain/value-objects/pain-type.vo';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import { STORAGE_PORT } from '../tokens';

/**
 * Paramètres requis pour modifier une saisie de symptômes existante.
 *
 * @remarks
 * id identifie l'entité à mettre à jour. createdAt est préservé depuis l'existant.
 */
export interface EditSymptomInput {
  readonly id: string;
  readonly occurredAt: Date;
  readonly category: SymptomCategory;
  readonly symptomKey: string;
  readonly intensity: number;
  readonly painZones?: ReadonlyArray<AbdominalZone>;
  readonly painTypes?: ReadonlyArray<PainType>;
  readonly stool?: StoolEntry;
  readonly gas?: GasEvent;
  readonly notes?: string;
}

/**
 * Met à jour une saisie de symptômes existante dans le journal quotidien.
 *
 * @remarks
 * Respecte SRP : responsabilité unique de modifier un SymptomEntity existant.
 * Préserve id et createdAt depuis l'entité originale. Ajoute editedAt.
 * Si l'id n'existe pas, ne fait rien (idempotent).
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useValue: mockStorage }]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class EditSymptomUseCase {
  private readonly storage = inject<StorageRepository<SymptomEntity>>(STORAGE_PORT as never);

  /**
   * Récupère le symptôme existant et le remplace par la version mise à jour.
   *
   * @param input - Données modifiées du symptôme
   * @returns void — silencieux si l'id est introuvable
   */
  async execute(input: EditSymptomInput): Promise<void> {
    const existing = await this.storage.get('symptoms', input.id);
    if (!existing) return;
    const updated: SymptomEntity = {
      ...existing,
      occurredAt: input.occurredAt,
      category: input.category,
      symptomKey: input.symptomKey,
      intensity: input.intensity,
      painZones: input.painZones,
      painTypes: input.painTypes,
      stool: input.stool,
      gas: input.gas,
      notes: input.notes,
      editedAt: new Date(),
    };
    await this.storage.save('symptoms', updated);
  }
}
