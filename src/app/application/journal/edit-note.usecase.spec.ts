import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { EditNoteUseCase } from './edit-note.usecase';
import { STORAGE_PORT } from '../tokens';
import type { NoteEntity } from '../../domain/entities/note.entity';

const existingNote: NoteEntity = {
  id: 'note-1',
  createdAt: new Date('2026-05-20T09:00:00'),
  occurredAt: new Date('2026-05-20T09:00:00'),
  inputMode: 'text',
  content: 'Contenu original',
  tags: ['tag1'],
  summary: 'Résumé original',
  linkedEntries: [],
};

function makeStorageMock(existing: NoteEntity | null = existingNote) {
  return {
    get: vi.fn().mockResolvedValue(existing ?? undefined),
    getAll: vi.fn(),
    getRange: vi.fn(),
    save: vi.fn().mockResolvedValue('note-1'),
    delete: vi.fn(),
    clear: vi.fn(),
  };
}

describe('EditNoteUseCase', () => {

  describe('nominal — note existante', () => {
    let mockStorage: ReturnType<typeof makeStorageMock>;

    beforeEach(() => {
      mockStorage = makeStorageMock();
      TestBed.configureTestingModule({
        providers: [
          EditNoteUseCase,
          { provide: STORAGE_PORT, useValue: mockStorage },
        ],
      });
    });

    it('lit la note existante avant de la mettre à jour', async () => {
      const useCase = TestBed.inject(EditNoteUseCase);
      await useCase.execute({ id: 'note-1', occurredAt: new Date(), inputMode: 'text', content: 'Nouveau contenu' });
      expect(mockStorage.get).toHaveBeenCalledWith('notes', 'note-1');
    });

    it('sauvegarde la note avec le contenu modifié', async () => {
      const useCase = TestBed.inject(EditNoteUseCase);
      await useCase.execute({ id: 'note-1', occurredAt: new Date(), inputMode: 'text', content: 'Nouveau contenu' });
      expect(mockStorage.save).toHaveBeenCalledWith(
        'notes',
        expect.objectContaining({ id: 'note-1', content: 'Nouveau contenu' }),
      );
    });

    it('préserve les tags et le résumé IA depuis l\'entité originale', async () => {
      const useCase = TestBed.inject(EditNoteUseCase);
      await useCase.execute({ id: 'note-1', occurredAt: new Date(), inputMode: 'text', content: 'Modifié' });
      const saved = mockStorage.save.mock.calls[0][1];
      expect(saved.tags).toEqual(['tag1']);
      expect(saved.summary).toBe('Résumé original');
    });

    it('préserve createdAt depuis l\'entité originale', async () => {
      const useCase = TestBed.inject(EditNoteUseCase);
      await useCase.execute({ id: 'note-1', occurredAt: new Date(), inputMode: 'text', content: 'Modifié' });
      const saved = mockStorage.save.mock.calls[0][1];
      expect(saved.createdAt).toEqual(existingNote.createdAt);
    });

    it('ajoute editedAt à la note mise à jour', async () => {
      const before = Date.now();
      const useCase = TestBed.inject(EditNoteUseCase);
      await useCase.execute({ id: 'note-1', occurredAt: new Date(), inputMode: 'text', content: 'Modifié' });
      const after = Date.now();
      const saved = mockStorage.save.mock.calls[0][1];
      expect(saved.editedAt).toBeInstanceOf(Date);
      expect(saved.editedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(saved.editedAt.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('id introuvable', () => {
    let mockStorage: ReturnType<typeof makeStorageMock>;

    beforeEach(() => {
      mockStorage = makeStorageMock(null);
      TestBed.configureTestingModule({
        providers: [
          EditNoteUseCase,
          { provide: STORAGE_PORT, useValue: mockStorage },
        ],
      });
    });

    it('ne fait rien si la note n\'existe pas en base', async () => {
      const useCase = TestBed.inject(EditNoteUseCase);
      await useCase.execute({ id: 'inexistant', occurredAt: new Date(), inputMode: 'text', content: 'Test' });
      expect(mockStorage.save).not.toHaveBeenCalled();
    });
  });
});
