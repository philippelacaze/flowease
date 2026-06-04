import { Injectable, inject } from '@angular/core';
import { StorageService } from '../../../core/services/storage.service';
import { AiService } from '../../../core/services/ai.service';
import type { NoteEntity, NoteInputMode, LinkedEntry } from '../../../core/models/entities/note.entity';
import type { NoteTaggingResult } from '../../../core/services/ai.service';

export interface AddNoteInput {
  readonly occurredAt: Date;
  readonly inputMode: NoteInputMode;
  readonly content: string;
  readonly imageBase64?: string;
  readonly linkedEntries?: ReadonlyArray<LinkedEntry>;
}

export interface EditNoteInput {
  readonly id: string;
  readonly occurredAt: Date;
  readonly inputMode: NoteInputMode;
  readonly content: string;
  readonly imageBase64?: string;
  readonly linkedEntries?: ReadonlyArray<LinkedEntry>;
}

const EMPTY_TAG_RESULT: NoteTaggingResult = { tags: [], summary: '' };

@Injectable({ providedIn: 'root' })
export class NoteService {
  private readonly storage = inject(StorageService);
  private readonly ai = inject(AiService);

  async add(input: AddNoteInput): Promise<string> {
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

  async edit(input: EditNoteInput): Promise<void> {
    const existing = await this.storage.get<NoteEntity>('notes', input.id);
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

  async tag(noteId: string): Promise<NoteTaggingResult> {
    const note = await this.storage.get<NoteEntity>('notes', noteId);
    if (!note) return EMPTY_TAG_RESULT;

    const result = await this.ai.tagNote(note.content);
    if (result === null) return EMPTY_TAG_RESULT;

    // Stocke les tags en attente de confirmation, sans modifier tags[]
    const updatedNote: NoteEntity = { ...note, aiTagSuggestions: result.tags, summary: result.summary };
    await this.storage.save('notes', updatedNote);
    return result;
  }

  async confirmTags(
    noteId: string,
    tags: ReadonlyArray<string>,
    aiTagSuggestions: ReadonlyArray<string>,
  ): Promise<void> {
    const note = await this.storage.get<NoteEntity>('notes', noteId);
    if (!note) return;
    const updated: NoteEntity = { ...note, tags, aiTagSuggestions };
    await this.storage.save('notes', updated);
  }
}
