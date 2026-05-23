import type { MealEntity } from '../entities/meal.entity';
import type { StorageRepository } from './storage.repository';

/**
 * Port de persistance des repas du journal.
 *
 * @remarks
 * Respecte ISP : spécialise StorageRepository<MealEntity> sans ajouter
 * de méthodes — le store 'meals' est encapsulé dans l'implémentation.
 * Injecté via STORAGE_PORT dans AddMealUseCase et GetJournalDayUseCase.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useClass: FakeStorageAdapter }]
 * ```
 */
export interface MealRepository extends StorageRepository<MealEntity> {}
