import { inject, Injectable } from '@angular/core';
import type { NoteEntity, NoteInputMode, LinkedEntry } from '../../domain/entities/note.entity';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import { STORAGE_PORT } from '../tokens';

/**
 * Paramètres requis pour créer une note.
 *
 * @remarks
 * id, createdAt, tags et summary sont exclus car gérés par le use case.
 * Les tags seront renseignés ultérieurement par TagNoteUseCase (port IA).
 */
export interface AddNoteInput {
  readonly occurredAt: Date;
  readonly inputMode: NoteInputMode;
  readonly content: string;
  readonly imageBase64?: string;
  readonly linkedEntries?: ReadonlyArray<LinkedEntry>;
}

/**
 * Enregistre une nouvelle note dans le journal quotidien, sans tags IA.
 *
 * @remarks
 * Respecte SRP : responsabilité unique de persister un NoteEntity vierge de tags.
 * Les tags et le résumé IA sont volontairement absents ici — ils sont ajoutés
 * par TagNoteUseCase après validation de la note par l'utilisateur.
 * Mode dégradé : aucune dépendance IA — fonctionne toujours, tags restent vides.
 *
 * Exemple d'injection TestBed :
 * ```typescript
 * providers: [{ provide: STORAGE_PORT, useClass: FakeStorageAdapter }]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class AddNoteUseCase {
  private readonly storage = inject<StorageRepository<NoteEntity>>(STORAGE_PORT as never);

  /**
   * Crée et persiste un NoteEntity avec tags vides (renseignés par TagNoteUseCase).
   *
   * @param input - Données de la note saisies par l'utilisateur
   * @returns L'identifiant UUID de la note créée
   */
  async execute(input: AddNoteInput): Promise<string> {
    const note: NoteEntity = {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      occurredAt: input.occurredAt,
      inputMode: input.inputMode,
      content: input.content,
      tags: [],
      summary: '',
      linkedEntries: input.linkedEntries ?? [],
      ...(input.imageBase64 && { imageBase64: input.imageBase64 }),
    };
    return this.storage.save('notes', note);
  }
}
