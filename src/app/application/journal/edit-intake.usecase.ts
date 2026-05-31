import { inject, Injectable } from '@angular/core';
import type { IntakeEntity, IntakeStatus, SkipReason } from '../../domain/entities/intake.entity';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import { STORAGE_PORT } from '../tokens';

/**
 * Paramètres requis pour modifier une prise de traitement existante.
 *
 * @remarks
 * id identifie l'entité à mettre à jour. treatmentId et scheduledAt sont préservés.
 */
export interface EditIntakeInput {
  readonly id: string;
  readonly confirmedAt: Date;
  readonly status: IntakeStatus;
  readonly skipReason?: SkipReason;
  readonly actualDose?: string;
  readonly notes?: string;
}

/**
 * Met à jour une prise de traitement existante dans le journal quotidien.
 *
 * @remarks
 * Respecte SRP : responsabilité unique de modifier un IntakeEntity existant.
 * Préserve id, treatmentId, scheduledAt et createdAt depuis l'entité originale.
 * Ajoute editedAt. Si l'id n'existe pas, ne fait rien (idempotent).
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useValue: mockStorage }]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class EditIntakeUseCase {
  private readonly storage = inject<StorageRepository<IntakeEntity>>(STORAGE_PORT as never);

  /**
   * Récupère la prise existante et la remplace par la version mise à jour.
   *
   * @param input - Données modifiées de la prise
   * @returns void — silencieux si l'id est introuvable
   */
  async execute(input: EditIntakeInput): Promise<void> {
    const existing = await this.storage.get('intakes', input.id);
    if (!existing) return;
    const updated: IntakeEntity = {
      ...existing,
      confirmedAt: input.confirmedAt,
      status: input.status,
      skipReason: input.skipReason,
      actualDose: input.actualDose,
      notes: input.notes,
      editedAt: new Date(),
    };
    await this.storage.save('intakes', updated);
  }
}
