import type { TreatmentEntity } from '../entities/treatment.entity';
import type { CureEntity } from '../entities/cure.entity';
import type { StorageRepository } from './storage.repository';

/**
 * Port de persistance des traitements.
 *
 * @remarks
 * Respecte ISP : spécialise StorageRepository<TreatmentEntity>.
 * Injecté via STORAGE_PORT dans les use cases Paramètres/Traitements
 * et dans GetAdherenceStatsUseCase pour récupérer les traitements actifs.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useClass: FakeStorageAdapter }]
 * ```
 */
export interface TreatmentRepository extends StorageRepository<TreatmentEntity> {}

/**
 * Port de persistance des cures (protocoles multi-traitements).
 *
 * @remarks
 * Respecte ISP : spécialise StorageRepository<CureEntity>.
 * Distinct de TreatmentRepository car le cycle de vie d'une cure
 * (start, pause, complete) est géré par des use cases dédiés.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useClass: FakeStorageAdapter }]
 * ```
 */
export interface CureRepository extends StorageRepository<CureEntity> {}
