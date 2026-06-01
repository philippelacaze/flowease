import { inject, Injectable } from '@angular/core';
import type { NoteEntity } from '../../domain/entities/note.entity';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import { STORAGE_PORT } from '../tokens';

/**
 * Finalise l'état des tags d'une note après validation utilisateur.
 *
 * @remarks
 * Respecte SRP : responsabilité unique de persister l'état final des tags d'une note.
 * Appelé par JournalHomeComponent après chaque action de confirmation/rejet de suggestion IA.
 * Le composant calcule le nouvel état ; ce use case se contente de le persister.
 * Si la note est introuvable, ne fait rien (idempotent).
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useValue: mockStorage }]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ConfirmNoteTagsUseCase {
  private readonly storage = inject<StorageRepository<NoteEntity>>(STORAGE_PORT as never);

  /**
   * Persiste les tags confirmés et les suggestions restantes d'une note.
   *
   * @param noteId - Identifiant UUID de la note à mettre à jour
   * @param tags - Liste finale des tags confirmés
   * @param aiTagSuggestions - Suggestions IA restantes (vide si toutes traitées)
   * @returns void — silencieux si la note est introuvable
   */
  async execute(
    noteId: string,
    tags: ReadonlyArray<string>,
    aiTagSuggestions: ReadonlyArray<string>,
  ): Promise<void> {
    const note = await this.storage.get('notes', noteId);
    if (!note) return;
    const updated: NoteEntity = { ...note, tags, aiTagSuggestions };
    await this.storage.save('notes', updated);
  }
}
