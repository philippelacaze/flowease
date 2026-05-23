import { inject, Injectable } from '@angular/core';
import type { IntakeEntity, IntakeStatus, SkipReason } from '../../domain/entities/intake.entity';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import { STORAGE_PORT } from '../tokens';

/**
 * Paramètres requis pour confirmer une prise de traitement.
 *
 * @remarks
 * id et createdAt sont exclus car assignés par le use case.
 */
export interface ConfirmIntakeInput {
  readonly treatmentId: string;
  readonly scheduledAt: Date;
  readonly confirmedAt: Date;
  readonly status: IntakeStatus;
  readonly skipReason?: SkipReason;
  readonly actualDose?: string;
  readonly notes?: string;
}

/**
 * Enregistre la confirmation (ou le saut) d'une prise de traitement.
 *
 * @remarks
 * Respecte SRP : responsabilité unique de persister un IntakeEntity.
 * Gère les deux statuts 'taken' et 'skipped' — le composant choisit lequel passer.
 * Mode dégradé : aucune dépendance IA — fonctionne toujours.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useClass: FakeStorageAdapter }]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ConfirmIntakeUseCase {
  private readonly storage = inject<StorageRepository<IntakeEntity>>(STORAGE_PORT as never);

  /**
   * Crée et persiste un IntakeEntity avec un UUID et un timestamp générés automatiquement.
   *
   * @param input - Données de la prise, incluant le statut 'taken' ou 'skipped'
   * @returns L'identifiant UUID de l'enregistrement créé
   */
  async execute(input: ConfirmIntakeInput): Promise<string> {
    const intake: IntakeEntity = {
      id: crypto.randomUUID(),
      treatmentId: input.treatmentId,
      scheduledAt: input.scheduledAt,
      confirmedAt: input.confirmedAt,
      createdAt: new Date(),
      status: input.status,
      ...(input.skipReason && { skipReason: input.skipReason }),
      ...(input.actualDose && { actualDose: input.actualDose }),
      ...(input.notes && { notes: input.notes }),
    };
    return this.storage.save('intakes', intake);
  }
}
