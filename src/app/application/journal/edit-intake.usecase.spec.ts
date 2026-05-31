import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { EditIntakeUseCase } from './edit-intake.usecase';
import { STORAGE_PORT } from '../tokens';
import type { IntakeEntity } from '../../domain/entities/intake.entity';

const existingIntake: IntakeEntity = {
  id: 'intake-1',
  treatmentId: 'treatment-rifaximin',
  scheduledAt: new Date('2026-05-20T08:00:00'),
  confirmedAt: new Date('2026-05-20T08:05:00'),
  createdAt: new Date('2026-05-20T08:05:00'),
  status: 'taken',
};

function makeStorageMock(existing: IntakeEntity | null = existingIntake) {
  return {
    get: vi.fn().mockResolvedValue(existing ?? undefined),
    getAll: vi.fn(),
    getRange: vi.fn(),
    save: vi.fn().mockResolvedValue('intake-1'),
    delete: vi.fn(),
    clear: vi.fn(),
  };
}

describe('EditIntakeUseCase', () => {

  describe('nominal — prise existante', () => {
    let mockStorage: ReturnType<typeof makeStorageMock>;

    beforeEach(() => {
      mockStorage = makeStorageMock();
      TestBed.configureTestingModule({
        providers: [
          EditIntakeUseCase,
          { provide: STORAGE_PORT, useValue: mockStorage },
        ],
      });
    });

    it('lit la prise existante avant de la mettre à jour', async () => {
      const useCase = TestBed.inject(EditIntakeUseCase);
      await useCase.execute({ id: 'intake-1', confirmedAt: new Date(), status: 'taken' });
      expect(mockStorage.get).toHaveBeenCalledWith('intakes', 'intake-1');
    });

    it('sauvegarde la prise avec le statut modifié', async () => {
      const useCase = TestBed.inject(EditIntakeUseCase);
      await useCase.execute({
        id: 'intake-1',
        confirmedAt: new Date(),
        status: 'skipped',
        skipReason: 'forgot',
      });
      expect(mockStorage.save).toHaveBeenCalledWith(
        'intakes',
        expect.objectContaining({ id: 'intake-1', status: 'skipped', skipReason: 'forgot' }),
      );
    });

    it('préserve treatmentId et scheduledAt depuis l\'entité originale', async () => {
      const useCase = TestBed.inject(EditIntakeUseCase);
      await useCase.execute({ id: 'intake-1', confirmedAt: new Date(), status: 'taken' });
      const saved = mockStorage.save.mock.calls[0][1];
      expect(saved.treatmentId).toBe('treatment-rifaximin');
      expect(saved.scheduledAt).toEqual(existingIntake.scheduledAt);
    });

    it('préserve createdAt depuis l\'entité originale', async () => {
      const useCase = TestBed.inject(EditIntakeUseCase);
      await useCase.execute({ id: 'intake-1', confirmedAt: new Date(), status: 'taken' });
      const saved = mockStorage.save.mock.calls[0][1];
      expect(saved.createdAt).toEqual(existingIntake.createdAt);
    });

    it('ajoute editedAt à la prise mise à jour', async () => {
      const before = Date.now();
      const useCase = TestBed.inject(EditIntakeUseCase);
      await useCase.execute({ id: 'intake-1', confirmedAt: new Date(), status: 'taken' });
      const after = Date.now();
      const saved = mockStorage.save.mock.calls[0][1];
      expect(saved.editedAt).toBeInstanceOf(Date);
      expect(saved.editedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(saved.editedAt.getTime()).toBeLessThanOrEqual(after);
    });

    it('sauvegarde la note libre si fournie', async () => {
      const useCase = TestBed.inject(EditIntakeUseCase);
      await useCase.execute({ id: 'intake-1', confirmedAt: new Date(), status: 'taken', notes: 'Pris avec eau' });
      const saved = mockStorage.save.mock.calls[0][1];
      expect(saved.notes).toBe('Pris avec eau');
    });
  });

  describe('id introuvable', () => {
    let mockStorage: ReturnType<typeof makeStorageMock>;

    beforeEach(() => {
      mockStorage = makeStorageMock(null);
      TestBed.configureTestingModule({
        providers: [
          EditIntakeUseCase,
          { provide: STORAGE_PORT, useValue: mockStorage },
        ],
      });
    });

    it('ne fait rien si la prise n\'existe pas en base', async () => {
      const useCase = TestBed.inject(EditIntakeUseCase);
      await useCase.execute({ id: 'inexistant', confirmedAt: new Date(), status: 'taken' });
      expect(mockStorage.save).not.toHaveBeenCalled();
    });
  });
});
