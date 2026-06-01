import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ConfirmNoteTagsUseCase } from './confirm-note-tags.usecase';
import { STORAGE_PORT } from '../tokens';
import type { NoteEntity } from '../../domain/entities/note.entity';

const mockNote: NoteEntity = {
  id: 'note-abc-123',
  createdAt: new Date('2026-05-23T10:00:00'),
  occurredAt: new Date('2026-05-23T09:30:00'),
  inputMode: 'text',
  content: 'Note de test',
  tags: [],
  aiTagSuggestions: ['crampes', 'post-repas', 'sibo'],
  summary: 'Résumé IA',
  linkedEntries: [],
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

describe('ConfirmNoteTagsUseCase', () => {
  describe('confirmation de tous les tags', () => {
    let mockStorage: ReturnType<typeof makeStorageMock>;

    beforeEach(() => {
      mockStorage = makeStorageMock();
      TestBed.configureTestingModule({
        providers: [
          ConfirmNoteTagsUseCase,
          { provide: STORAGE_PORT, useValue: mockStorage },
        ],
      });
    });

    it('persiste les tags confirmés et vide aiTagSuggestions', async () => {
      const useCase = TestBed.inject(ConfirmNoteTagsUseCase);
      await useCase.execute(mockNote.id, ['crampes', 'post-repas', 'sibo'], []);
      expect(mockStorage.save).toHaveBeenCalledWith(
        'notes',
        expect.objectContaining({
          id: mockNote.id,
          tags: ['crampes', 'post-repas', 'sibo'],
          aiTagSuggestions: [],
        }),
      );
    });

    it('persiste une confirmation partielle avec suggestions restantes', async () => {
      const useCase = TestBed.inject(ConfirmNoteTagsUseCase);
      await useCase.execute(mockNote.id, ['crampes'], ['post-repas', 'sibo']);
      expect(mockStorage.save).toHaveBeenCalledWith(
        'notes',
        expect.objectContaining({
          tags: ['crampes'],
          aiTagSuggestions: ['post-repas', 'sibo'],
        }),
      );
    });

    it('persiste un tag libre ajouté avec les suggestions inchangées', async () => {
      const useCase = TestBed.inject(ConfirmNoteTagsUseCase);
      await useCase.execute(mockNote.id, ['tag-libre'], ['crampes', 'post-repas', 'sibo']);
      expect(mockStorage.save).toHaveBeenCalledWith(
        'notes',
        expect.objectContaining({
          tags: ['tag-libre'],
          aiTagSuggestions: ['crampes', 'post-repas', 'sibo'],
        }),
      );
    });

    it('préserve les autres champs de la note (content, summary, etc.)', async () => {
      const useCase = TestBed.inject(ConfirmNoteTagsUseCase);
      await useCase.execute(mockNote.id, ['crampes'], []);
      expect(mockStorage.save).toHaveBeenCalledWith(
        'notes',
        expect.objectContaining({
          content: mockNote.content,
          summary: mockNote.summary,
          createdAt: mockNote.createdAt,
        }),
      );
    });
  });

  describe('note introuvable', () => {
    let mockStorage: ReturnType<typeof makeStorageMock>;

    beforeEach(() => {
      mockStorage = makeStorageMock();
      mockStorage.get.mockResolvedValue(undefined);
      TestBed.configureTestingModule({
        providers: [
          ConfirmNoteTagsUseCase,
          { provide: STORAGE_PORT, useValue: mockStorage },
        ],
      });
    });

    it('ne fait rien si la note n\'existe pas en storage', async () => {
      const useCase = TestBed.inject(ConfirmNoteTagsUseCase);
      await expect(useCase.execute('id-inexistant', ['tag'], [])).resolves.toBeUndefined();
      expect(mockStorage.save).not.toHaveBeenCalled();
    });
  });

  describe('erreur storage', () => {
    beforeEach(() => {
      const failingStorage = {
        get: vi.fn().mockRejectedValue(new Error('IndexedDB indisponible')),
        getAll: vi.fn(), getRange: vi.fn(), save: vi.fn(), delete: vi.fn(), clear: vi.fn(),
      };
      TestBed.configureTestingModule({
        providers: [
          ConfirmNoteTagsUseCase,
          { provide: STORAGE_PORT, useValue: failingStorage },
        ],
      });
    });

    it('propage l\'exception si la lecture storage échoue', async () => {
      const useCase = TestBed.inject(ConfirmNoteTagsUseCase);
      await expect(useCase.execute(mockNote.id, [], [])).rejects.toThrow('IndexedDB indisponible');
    });
  });
});
