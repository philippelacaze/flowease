import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AddNoteUseCase } from './add-note.usecase';
import { STORAGE_PORT } from '../tokens';

function makeStorageMock() {
  return {
    get: vi.fn(),
    getAll: vi.fn(),
    getRange: vi.fn(),
    save: vi.fn().mockResolvedValue('note-id'),
    delete: vi.fn(),
    clear: vi.fn(),
  };
}

const baseInput = {
  occurredAt: new Date('2026-05-23T10:00:00'),
  inputMode: 'text' as const,
  content: 'Ballonnements après déjeuner',
};

describe('AddNoteUseCase', () => {

  describe('nominal — stockage disponible', () => {
    let mockStorage: ReturnType<typeof makeStorageMock>;

    beforeEach(() => {
      mockStorage = makeStorageMock();
      TestBed.configureTestingModule({
        providers: [
          AddNoteUseCase,
          { provide: STORAGE_PORT, useValue: mockStorage },
        ],
      });
    });

    it('assigne un UUID à chaque note créée', async () => {
      const useCase = TestBed.inject(AddNoteUseCase);
      await useCase.execute(baseInput);
      const saved = mockStorage.save.mock.calls[0][1];
      expect(saved.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('assigne un timestamp createdAt automatiquement', async () => {
      const before = Date.now();
      const useCase = TestBed.inject(AddNoteUseCase);
      await useCase.execute(baseInput);
      const after = Date.now();
      const saved = mockStorage.save.mock.calls[0][1];
      expect(saved.createdAt).toBeInstanceOf(Date);
      expect(saved.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(saved.createdAt.getTime()).toBeLessThanOrEqual(after);
    });

    it('préserve occurredAt tel quel depuis l\'input', async () => {
      const useCase = TestBed.inject(AddNoteUseCase);
      await useCase.execute(baseInput);
      expect(mockStorage.save).toHaveBeenCalledWith(
        'notes',
        expect.objectContaining({ occurredAt: baseInput.occurredAt }),
      );
    });

    it('retourne l\'identifiant généré par le storage', async () => {
      const useCase = TestBed.inject(AddNoteUseCase);
      const id = await useCase.execute(baseInput);
      expect(id).toBe('note-id');
    });

    it('initialise tags à un tableau vide', async () => {
      const useCase = TestBed.inject(AddNoteUseCase);
      await useCase.execute(baseInput);
      const saved = mockStorage.save.mock.calls[0][1];
      expect(saved.tags).toEqual([]);
    });

    it('initialise summary à une chaîne vide', async () => {
      const useCase = TestBed.inject(AddNoteUseCase);
      await useCase.execute(baseInput);
      const saved = mockStorage.save.mock.calls[0][1];
      expect(saved.summary).toBe('');
    });

    it('inclut imageBase64 si fourni', async () => {
      const useCase = TestBed.inject(AddNoteUseCase);
      await useCase.execute({ ...baseInput, imageBase64: 'abc123==' });
      expect(mockStorage.save).toHaveBeenCalledWith(
        'notes',
        expect.objectContaining({ imageBase64: 'abc123==' }),
      );
    });

    it('n\'inclut pas imageBase64 si absent de l\'input', async () => {
      const useCase = TestBed.inject(AddNoteUseCase);
      await useCase.execute(baseInput);
      const saved = mockStorage.save.mock.calls[0][1];
      expect(saved.imageBase64).toBeUndefined();
    });

    it('persiste dans le store "notes"', async () => {
      const useCase = TestBed.inject(AddNoteUseCase);
      await useCase.execute(baseInput);
      expect(mockStorage.save.mock.calls[0][0]).toBe('notes');
    });

    it('deux exécutions produisent deux UUID distincts', async () => {
      const useCase = TestBed.inject(AddNoteUseCase);
      await useCase.execute(baseInput);
      await useCase.execute(baseInput);
      const id1 = mockStorage.save.mock.calls[0][1].id;
      const id2 = mockStorage.save.mock.calls[1][1].id;
      expect(id1).not.toBe(id2);
    });
  });
});
