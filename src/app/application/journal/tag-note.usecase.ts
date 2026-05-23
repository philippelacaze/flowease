import { inject, Injectable, Inject } from '@angular/core';
import type { NoteEntity } from '../../domain/entities/note.entity';
import type { NoteTaggingPort, NoteTaggingResult } from '../../domain/repositories/ai/note-tagging.port';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import { NOTE_TAGGING_PORT, STORAGE_PORT } from '../tokens';

const EMPTY_RESULT: NoteTaggingResult = { tags: [], summary: '' };

/**
 * Génère et persiste les tags IA d'une note existante.
 *
 * @remarks
 * Respecte SRP : responsabilité unique d'enrichir une NoteEntity avec les tags IA.
 * Séparé de AddNoteUseCase pour permettre le taguage asynchrone après validation utilisateur.
 * Mode dégradé : retourne { tags: [], summary: '' } si le port retourne null — jamais throw.
 * Les erreurs storage sont propagées : elles signalent un état anormal du système.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [
 *   { provide: NOTE_TAGGING_PORT, useClass: NullAIAdapter },
 *   { provide: STORAGE_PORT, useValue: fakeStorage },
 * ]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class TagNoteUseCase {
  private readonly storage = inject<StorageRepository<NoteEntity>>(STORAGE_PORT as never);

  constructor(
    @Inject(NOTE_TAGGING_PORT) private readonly noteTaggingPort: NoteTaggingPort,
  ) {}

  /**
   * Tague une note existante et met à jour son entrée en storage.
   *
   * @param noteId - Identifiant UUID de la note à tagger
   * @returns NoteTaggingResult avec les tags générés, ou { tags: [], summary: '' } si IA indisponible
   */
  async execute(noteId: string): Promise<NoteTaggingResult> {
    const note = await this.storage.get('notes', noteId);
    if (!note) {
      return EMPTY_RESULT;
    }

    const result = await this.noteTaggingPort.tagNote(note.content);
    if (result === null) {
      return EMPTY_RESULT;
    }

    const updatedNote: NoteEntity = { ...note, tags: result.tags, summary: result.summary };
    await this.storage.save('notes', updatedNote);
    return result;
  }
}
