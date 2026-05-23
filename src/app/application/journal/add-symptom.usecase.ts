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
 * Paramètres requis pour créer une saisie de symptômes.
 *
 * @remarks
 * id et createdAt sont exclus car assignés par le use case.
 */
export interface AddSymptomInput {
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
 * Enregistre une saisie de symptômes dans le journal quotidien.
 *
 * @remarks
 * Respecte SRP : responsabilité unique de persister un SymptomEntity.
 * id et createdAt sont générés ici, jamais par le composant.
 * Mode dégradé : aucune dépendance IA — fonctionne toujours.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useClass: FakeStorageAdapter }]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class AddSymptomUseCase {
  private readonly storage = inject<StorageRepository<SymptomEntity>>(STORAGE_PORT as never);

  /**
   * Crée et persiste un SymptomEntity avec un UUID et un timestamp générés automatiquement.
   *
   * @param input - Données de symptômes saisies par l'utilisateur
   * @returns L'identifiant UUID de la saisie créée
   */
  async execute(input: AddSymptomInput): Promise<string> {
    const symptom: SymptomEntity = {
      id: crypto.randomUUID(),
      occurredAt: input.occurredAt,
      createdAt: new Date(),
      category: input.category,
      symptomKey: input.symptomKey,
      intensity: input.intensity,
      ...(input.painZones && { painZones: input.painZones }),
      ...(input.painTypes && { painTypes: input.painTypes }),
      ...(input.stool && { stool: input.stool }),
      ...(input.gas && { gas: input.gas }),
      ...(input.notes && { notes: input.notes }),
    };
    return this.storage.save('symptoms', symptom);
  }
}
