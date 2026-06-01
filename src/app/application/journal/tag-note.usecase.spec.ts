import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { TagNoteUseCase } from './tag-note.usecase';
import { NOTE_TAGGING_PORT, STORAGE_PORT } from '../tokens';
import { NullAIAdapter } from '../../infrastructure/ai/null/null-ai.adapter';
import type { NoteEntity } from '../../domain/entities/note.entity';
import type { NoteTaggingResult } from '../../domain/repositories/ai/note-tagging.port';

const mockNote: NoteEntity = {
  id: 'note-abc-123',
  createdAt: new Date('2026-05-23T10:00:00'),
  occurredAt: new Date('2026-05-23T09:30:00'),
  inputMode: 'text',
  content: 'J\'ai eu de fortes crampes abdominales après le déjeuner',
  tags: [],
  summary: '',
  linkedEntries: [],
};

const mockTaggingResult: NoteTaggingResult = {
  tags: ['crampes', 'post-repas', 'sibo'],
  summary: 'Crampes abdominales signalées après le déjeuner',
};

function makeStorageMock(noteToReturn: NoteEntity | undefined = mockNote) {
  return {
    get: vi.fn().mockResolvedValue(noteToReturn),
    getAll: vi.fn().mockResolvedValue([]),
    getRange: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(mockNote.id),
    delete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  };
}

describe('TagNoteUseCase', () => {

  describe('nominal — port IA et storage disponibles', () => {
    let mockStorage: ReturnType<typeof makeStorageMock>;
    const mockTaggingPort = { tagNote: vi.fn() };

    beforeEach(() => {
      mockStorage = makeStorageMock();
      vi.clearAllMocks();
      mockTaggingPort.tagNote.mockResolvedValue(mockTaggingResult);
      TestBed.configureTestingModule({
        providers: [
          TagNoteUseCase,
          { provide: NOTE_TAGGING_PORT, useValue: mockTaggingPort },
          { provide: STORAGE_PORT, useValue: mockStorage },
        ],
      });
    });

    it('retourne les tags et le résumé générés par l\'IA', async () => {
      const useCase = TestBed.inject(TagNoteUseCase);
      const result = await useCase.execute(mockNote.id);
      expect(result).toEqual(mockTaggingResult);
    });

    it('transmet le contenu de la note au port de taguage', async () => {
      const useCase = TestBed.inject(TagNoteUseCase);
      await useCase.execute(mockNote.id);
      expect(mockTaggingPort.tagNote).toHaveBeenCalledWith(mockNote.content);
    });

    it('persiste les suggestions IA dans aiTagSuggestions (pas dans tags)', async () => {
      const useCase = TestBed.inject(TagNoteUseCase);
      await useCase.execute(mockNote.id);
      expect(mockStorage.save).toHaveBeenCalledWith(
        'notes',
        expect.objectContaining({
          id: mockNote.id,
          aiTagSuggestions: mockTaggingResult.tags,
          summary: mockTaggingResult.summary,
        }),
      );
    });

    it('ne modifie pas tags[] lors du taguage IA (tags restent vides)', async () => {
      const useCase = TestBed.inject(TagNoteUseCase);
      await useCase.execute(mockNote.id);
      expect(mockStorage.save).toHaveBeenCalledWith(
        'notes',
        expect.objectContaining({ tags: mockNote.tags }),
      );
    });

    it('retourne un résultat vide si la note est introuvable en storage', async () => {
      mockStorage.get.mockResolvedValue(undefined);
      const useCase = TestBed.inject(TagNoteUseCase);
      const result = await useCase.execute('id-inexistant');
      expect(result).toEqual({ tags: [], summary: '' });
    });
  });

  describe('mode dégradé — NullAIAdapter injecté', () => {
    let mockStorage: ReturnType<typeof makeStorageMock>;

    beforeEach(() => {
      mockStorage = makeStorageMock();
      TestBed.configureTestingModule({
        providers: [
          TagNoteUseCase,
          { provide: NOTE_TAGGING_PORT, useClass: NullAIAdapter },
          { provide: STORAGE_PORT, useValue: mockStorage },
        ],
      });
    });

    it('retourne tags vides et résumé vide sans lever d\'exception', async () => {
      const useCase = TestBed.inject(TagNoteUseCase);
      const result = await useCase.execute(mockNote.id);
      expect(result).toEqual({ tags: [], summary: '' });
    });

    it('ne persiste pas de mise à jour quand l\'IA est indisponible', async () => {
      const useCase = TestBed.inject(TagNoteUseCase);
      await useCase.execute(mockNote.id);
      expect(mockStorage.save).not.toHaveBeenCalled();
    });
  });

  describe('erreur storage — la lecture échoue', () => {
    const mockTaggingPort = { tagNote: vi.fn() };
    const storageError = new Error('IndexedDB indisponible');

    beforeEach(() => {
      const failingStorage = {
        get: vi.fn().mockRejectedValue(storageError),
        getAll: vi.fn(),
        getRange: vi.fn(),
        save: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
      };
      TestBed.configureTestingModule({
        providers: [
          TagNoteUseCase,
          { provide: NOTE_TAGGING_PORT, useValue: mockTaggingPort },
          { provide: STORAGE_PORT, useValue: failingStorage },
        ],
      });
    });

    it('propage l\'exception storage sans la masquer', async () => {
      const useCase = TestBed.inject(TagNoteUseCase);
      await expect(useCase.execute(mockNote.id)).rejects.toThrow('IndexedDB indisponible');
    });

    it('n\'appelle pas le port IA si la lecture storage échoue', async () => {
      const useCase = TestBed.inject(TagNoteUseCase);
      await expect(useCase.execute(mockNote.id)).rejects.toThrow();
      expect(mockTaggingPort.tagNote).not.toHaveBeenCalled();
    });
  });
});
