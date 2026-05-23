import type { IntakeEntity } from '../entities/intake.entity';
import type { StorageRepository } from './storage.repository';

/**
 * Port de persistance des confirmations de prise de traitements.
 *
 * @remarks
 * Respecte ISP : spécialise StorageRepository<IntakeEntity>.
 * Injecté via STORAGE_PORT dans ConfirmIntakeUseCase, GetJournalDayUseCase
 * et GetAdherenceStatsUseCase.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useClass: FakeStorageAdapter }]
 * ```
 */
export interface IntakeRepository extends StorageRepository<IntakeEntity> {}
