import { Injectable, inject } from '@angular/core';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import type { TreatmentEntity } from '../../domain/entities/treatment.entity';
import type { IntakeEntity } from '../../domain/entities/intake.entity';
import { STORAGE_PORT } from '../tokens';

/**
 * Statistique d'observance pour un traitement sur une fenêtre temporelle.
 *
 * @remarks
 * Value Object retourné par GetAdherenceStatsUseCase. adherenceRate est
 * compris entre 0 (aucune prise) et 1 (observance parfaite).
 */
export interface AdherenceStat {
  readonly treatmentId: string;
  readonly treatmentName: string;
  readonly takenCount: number;
  readonly expectedCount: number;
  readonly adherenceRate: number;
}

/**
 * Calcule l'observance des traitements sur une fenêtre temporelle.
 *
 * @remarks
 * Respecte SRP : seul calcul d'observance, sans dépendance IA.
 * Fonctionne hors-ligne — lit uniquement depuis IndexedDB.
 * expectedCount = treatment.frequency × windowDays pour les traitements actifs.
 * Mode dégradé : retourne [] si aucun traitement enregistré.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useValue: mockStorage }]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class GetAdherenceStatsUseCase {
  private readonly storage = inject<StorageRepository<{ id: string }>>(STORAGE_PORT as never);

  /**
   * Retourne les statistiques d'observance pour chaque traitement actif.
   *
   * @param windowDays - Nombre de jours à analyser en remontant depuis aujourd'hui
   * @returns Tableau d'AdherenceStat, un par traitement actif
   */
  async execute(windowDays: number): Promise<AdherenceStat[]> {
    const now = new Date();
    const lower = new Date(now);
    lower.setDate(lower.getDate() - windowDays);
    lower.setHours(0, 0, 0, 0);

    const [allTreatments, intakesInWindow] = await Promise.all([
      this.storage.getAll('treatments') as Promise<TreatmentEntity[]>,
      this.storage.getRange('intakes', 'occurredAt', lower, now) as Promise<IntakeEntity[]>,
    ]);

    const activeTreatments = allTreatments.filter(t => t.active);

    return activeTreatments.map(treatment => {
      const taken = intakesInWindow.filter(
        i => i.treatmentId === treatment.id && i.status === 'taken',
      );
      const expectedCount = treatment.frequency * windowDays;
      const takenCount = taken.length;

      return {
        treatmentId: treatment.id,
        treatmentName: treatment.name,
        takenCount,
        expectedCount,
        adherenceRate: expectedCount > 0 ? Math.min(takenCount / expectedCount, 1) : 0,
      };
    });
  }
}
