import type { SymptomEntity } from '../entities/symptom.entity';
import type { StorageRepository } from './storage.repository';

/**
 * Port de persistance des saisies de symptômes du journal.
 *
 * @remarks
 * Respecte ISP : spécialise StorageRepository<SymptomEntity>.
 * Injecté via STORAGE_PORT dans AddSymptomUseCase, GetJournalDayUseCase
 * et GetSymptomTrendsUseCase.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useClass: FakeStorageAdapter }]
 * ```
 */
export interface SymptomRepository extends StorageRepository<SymptomEntity> {}
