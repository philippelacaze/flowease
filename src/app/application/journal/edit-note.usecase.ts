import { inject, Injectable } from '@angular/core';
import type { NoteEntity, NoteInputMode, LinkedEntry } from '../../domain/entities/note.entity';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import { STORAGE_PORT } from '../tokens';

/**
 * Paramètres requis pour modifier une note existante.
 *
 * @remarks
 * id identifie l'entité à mettre à jour. createdAt, tags et summary sont préservés.
 */
export interface EditNoteInput {
  readonly id: string;
  readonly occurredAt: Date;
  readonly inputMode: NoteInputMode;
  readonly content: string;
  readonly imageBase64?: string;
  readonly linkedEntries?: ReadonlyArray<LinkedEntry>;
}

/**
 * Met à jour une note existante dans le journal quotidien.
 *
 * @remarks
 * Respecte SRP : responsabilité unique de modifier un NoteEntity existant.
 * Préserve id, createdAt, tags et summary depuis l'entité originale. Ajoute editedAt.
 * Si l'id n'existe pas, ne fait rien (idempotent).
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useValue: mockStorage }]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class EditNoteUseCase {
  private readonly storage = inject<StorageRepository<NoteEntity>>(STORAGE_PORT as never);

  /**
   * Récupère la note existante et la remplace par la version mise à jour.
   *
   * @param input - Données modifiées de la note
   * @returns void — silencieux si l'id est introuvable
   */
  async execute(input: EditNoteInput): Promise<void> {
    const existing = await this.storage.get('notes', input.id);
    if (!existing) return;
    const updated: NoteEntity = {
      ...existing,
      occurredAt: input.occurredAt,
      inputMode: input.inputMode,
      content: input.content,
      imageBase64: input.imageBase64,
      linkedEntries: input.linkedEntries ?? existing.linkedEntries,
      editedAt: new Date(),
    };
    await this.storage.save('notes', updated);
  }
}
