import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { NoteService } from './note.service';
import { StorageService } from '../../../core/services/storage.service';
import { AiService } from '../../../core/services/ai.service';
import { NullAiService } from '../../../core/services/null-ai.service';

function makeStorageMock(noteToReturn?: unknown) {
  return {
    get: vi.fn().mockResolvedValue(noteToReturn),
    getAll: vi.fn().mockResolvedValue([]),
    getRange: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue('note-id'),
    delete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  };
}

const mockNote = {
  id: 'note-1',
  createdAt: new Date(),
  occurredAt: new Date(),
  inputMode: 'text' as const,
  content: 'Crampes abdominales',
  tags: [],
  summary: '',
  linkedEntries: [],
};

describe('NoteService', () => {

  describe('add', () => {
    it('persiste une NoteEntity avec tags vides et UUID', async () => {
      const storage = makeStorageMock();
      TestBed.configureTestingModule({
        providers: [NoteService, { provide: StorageService, useValue: storage }, { provide: AiService, useClass: NullAiService }],
      });
      const svc = TestBed.inject(NoteService);
      await svc.add({ occurredAt: new Date(), inputMode: 'text', content: 'Test' });
      const saved = storage.save.mock.calls[0][1] as { id: string; tags: string[]; summary: string };
      expect(saved.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(saved.tags).toEqual([]);
      expect(saved.summary).toBe('');
    });
  });

  describe('edit', () => {
    it('ne fait rien si la note est introuvable', async () => {
      const storage = makeStorageMock(undefined);
      TestBed.configureTestingModule({
        providers: [NoteService, { provide: StorageService, useValue: storage }, { provide: AiService, useClass: NullAiService }],
      });
      const svc = TestBed.inject(NoteService);
      await svc.edit({ id: 'absent', occurredAt: new Date(), inputMode: 'text', content: 'X' });
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('met à jour la note avec editedAt', async () => {
      const storage = makeStorageMock(mockNote);
      TestBed.configureTestingModule({
        providers: [NoteService, { provide: StorageService, useValue: storage }, { provide: AiService, useClass: NullAiService }],
      });
      const svc = TestBed.inject(NoteService);
      await svc.edit({ id: 'note-1', occurredAt: new Date(), inputMode: 'text', content: 'Mis à jour' });
      expect(storage.save).toHaveBeenCalledWith('notes', expect.objectContaining({ content: 'Mis à jour', editedAt: expect.any(Date) }));
    });
  });

  describe('tag', () => {
    it('retourne un résultat vide si la note est introuvable', async () => {
      const storage = makeStorageMock(undefined);
      TestBed.configureTestingModule({
        providers: [NoteService, { provide: StorageService, useValue: storage }, { provide: AiService, useClass: NullAiService }],
      });
      const svc = TestBed.inject(NoteService);
      const result = await svc.tag('absent');
      expect(result).toEqual({ tags: [], summary: '' });
    });

    it('retourne un résultat vide si AiService est indisponible', async () => {
      const storage = makeStorageMock(mockNote);
      TestBed.configureTestingModule({
        providers: [NoteService, { provide: StorageService, useValue: storage }, { provide: AiService, useClass: NullAiService }],
      });
      const svc = TestBed.inject(NoteService);
      const result = await svc.tag('note-1');
      expect(result).toEqual({ tags: [], summary: '' });
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('persiste les suggestions IA dans aiTagSuggestions', async () => {
      const mockAi = { tagNote: vi.fn().mockResolvedValue({ tags: ['crampes', 'sibo'], summary: 'Résumé' }) };
      const storage = makeStorageMock(mockNote);
      TestBed.configureTestingModule({
        providers: [NoteService, { provide: StorageService, useValue: storage }, { provide: AiService, useValue: mockAi }],
      });
      const svc = TestBed.inject(NoteService);
      const result = await svc.tag('note-1');
      expect(result.tags).toEqual(['crampes', 'sibo']);
      expect(storage.save).toHaveBeenCalledWith('notes', expect.objectContaining({ aiTagSuggestions: ['crampes', 'sibo'] }));
    });

    it('transmet les conditions du profil à tagNote', async () => {
      const mockAi = { tagNote: vi.fn().mockResolvedValue({ tags: [], summary: '' }) };
      const storage = {
        ...makeStorageMock(),
        get: vi.fn().mockImplementation((store: string) =>
          Promise.resolve(
            store === 'user-profile'
              ? { id: 'singleton', conditions: ['gastroparesis'], otherConditions: 'Endométriose' }
              : mockNote,
          ),
        ),
      };
      TestBed.configureTestingModule({
        providers: [NoteService, { provide: StorageService, useValue: storage }, { provide: AiService, useValue: mockAi }],
      });
      const svc = TestBed.inject(NoteService);
      await svc.tag('note-1');
      expect(mockAi.tagNote).toHaveBeenCalledWith('Crampes abdominales', ['gastroparesis'], 'Endométriose');
    });
  });

  describe('confirmTags', () => {
    it('ne fait rien si la note est introuvable', async () => {
      const storage = makeStorageMock(undefined);
      TestBed.configureTestingModule({
        providers: [NoteService, { provide: StorageService, useValue: storage }, { provide: AiService, useClass: NullAiService }],
      });
      const svc = TestBed.inject(NoteService);
      await svc.confirmTags('absent', ['tag'], []);
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('persiste les tags confirmés et les suggestions restantes', async () => {
      const storage = makeStorageMock(mockNote);
      TestBed.configureTestingModule({
        providers: [NoteService, { provide: StorageService, useValue: storage }, { provide: AiService, useClass: NullAiService }],
      });
      const svc = TestBed.inject(NoteService);
      await svc.confirmTags('note-1', ['crampes'], ['sibo']);
      expect(storage.save).toHaveBeenCalledWith('notes', expect.objectContaining({ tags: ['crampes'], aiTagSuggestions: ['sibo'] }));
    });
  });
});
