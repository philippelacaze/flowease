import type { NoteEntity } from '../entities/note.entity';
import type { StorageRepository } from './storage.repository';

/**
 * Port de persistance des notes libres du journal.
 *
 * @remarks
 * Respecte ISP : spécialise StorageRepository<NoteEntity>.
 * Injecté via STORAGE_PORT dans AddNoteUseCase, TagNoteUseCase
 * et GetJournalDayUseCase.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useClass: FakeStorageAdapter }]
 * ```
 */
export interface NoteRepository extends StorageRepository<NoteEntity> {}
