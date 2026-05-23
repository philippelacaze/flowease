import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ConfirmIntakeUseCase } from './confirm-intake.usecase';
import { STORAGE_PORT } from '../tokens';

function makeStorageMock() {
  return {
    get: vi.fn(),
    getAll: vi.fn(),
    getRange: vi.fn(),
    save: vi.fn().mockResolvedValue('intake-id'),
    delete: vi.fn(),
    clear: vi.fn(),
  };
}

const baseInput = {
  treatmentId: 'treat-1',
  scheduledAt: new Date('2026-05-23T08:00:00'),
  confirmedAt: new Date('2026-05-23T08:05:00'),
  status: 'taken' as const,
};

describe('ConfirmIntakeUseCase', () => {

  describe('status taken', () => {
    let mockStorage: ReturnType<typeof makeStorageMock>;

    beforeEach(() => {
      mockStorage = makeStorageMock();
      TestBed.configureTestingModule({
        providers: [
          ConfirmIntakeUseCase,
          { provide: STORAGE_PORT, useValue: mockStorage },
        ],
      });
    });

    it('persiste une prise avec le status taken', async () => {
      const useCase = TestBed.inject(ConfirmIntakeUseCase);
      await useCase.execute(baseInput);
      expect(mockStorage.save).toHaveBeenCalledWith(
        'intakes',
        expect.objectContaining({ status: 'taken' }),
      );
    });

    it('assigne un UUID à l\'enregistrement', async () => {
      const useCase = TestBed.inject(ConfirmIntakeUseCase);
      await useCase.execute(baseInput);
      const saved = mockStorage.save.mock.calls[0][1];
      expect(saved.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('assigne un createdAt automatiquement', async () => {
      const before = Date.now();
      const useCase = TestBed.inject(ConfirmIntakeUseCase);
      await useCase.execute(baseInput);
      const after = Date.now();
      const saved = mockStorage.save.mock.calls[0][1];
      expect(saved.createdAt).toBeInstanceOf(Date);
      expect(saved.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(saved.createdAt.getTime()).toBeLessThanOrEqual(after);
    });

    it('conserve le treatmentId et les horodatages fournis', async () => {
      const useCase = TestBed.inject(ConfirmIntakeUseCase);
      await useCase.execute(baseInput);
      expect(mockStorage.save).toHaveBeenCalledWith(
        'intakes',
        expect.objectContaining({
          treatmentId: 'treat-1',
          scheduledAt: baseInput.scheduledAt,
          confirmedAt: baseInput.confirmedAt,
        }),
      );
    });
  });

  describe('status skipped', () => {
    let mockStorage: ReturnType<typeof makeStorageMock>;

    beforeEach(() => {
      mockStorage = makeStorageMock();
      TestBed.configureTestingModule({
        providers: [
          ConfirmIntakeUseCase,
          { provide: STORAGE_PORT, useValue: mockStorage },
        ],
      });
    });

    it('persiste une prise avec le status skipped', async () => {
      const useCase = TestBed.inject(ConfirmIntakeUseCase);
      await useCase.execute({ ...baseInput, status: 'skipped', skipReason: 'forgot' });
      expect(mockStorage.save).toHaveBeenCalledWith(
        'intakes',
        expect.objectContaining({ status: 'skipped', skipReason: 'forgot' }),
      );
    });

    it('n\'inclut pas skipReason si non fourni en mode taken', async () => {
      const useCase = TestBed.inject(ConfirmIntakeUseCase);
      await useCase.execute(baseInput);
      const saved = mockStorage.save.mock.calls[0][1];
      expect(saved.skipReason).toBeUndefined();
    });

    it('inclut la dose réelle et la note si fournies', async () => {
      const useCase = TestBed.inject(ConfirmIntakeUseCase);
      await useCase.execute({ ...baseInput, actualDose: '500mg', notes: 'Pris avec du jus' });
      expect(mockStorage.save).toHaveBeenCalledWith(
        'intakes',
        expect.objectContaining({ actualDose: '500mg', notes: 'Pris avec du jus' }),
      );
    });
  });

  describe('erreur storage — save échoue', () => {
    beforeEach(() => {
      const failingStorage = {
        get: vi.fn(),
        getAll: vi.fn(),
        getRange: vi.fn(),
        save: vi.fn().mockRejectedValue(new Error('Disque plein')),
        delete: vi.fn(),
        clear: vi.fn(),
      };
      TestBed.configureTestingModule({
        providers: [
          ConfirmIntakeUseCase,
          { provide: STORAGE_PORT, useValue: failingStorage },
        ],
      });
    });

    it('propage l\'erreur storage sans la masquer', async () => {
      const useCase = TestBed.inject(ConfirmIntakeUseCase);
      await expect(useCase.execute(baseInput)).rejects.toThrow('Disque plein');
    });
  });
});
