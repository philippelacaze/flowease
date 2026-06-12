import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { IntakeService } from './intake.service';
import { StorageService } from '../../../core/services/storage.service';
import { LocalSettingsService } from '../../../core/services/local-settings.service';

function makeStorageMock() {
  return {
    get: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue([]),
    getRange: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue('id'),
    delete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  };
}

function makeSettingsMock(coachSuggestions = false) {
  return { getCoachSuggestions: vi.fn().mockReturnValue(coachSuggestions) };
}

describe('IntakeService', () => {

  describe('confirm', () => {
    it('persiste un IntakeEntity avec UUID', async () => {
      const storage = makeStorageMock();
      TestBed.configureTestingModule({
        providers: [
          IntakeService,
          { provide: StorageService, useValue: storage },
          { provide: LocalSettingsService, useValue: makeSettingsMock() },
        ],
      });
      const svc = TestBed.inject(IntakeService);
      await svc.confirm({ treatmentId: 't-1', scheduledAt: new Date(), confirmedAt: new Date(), status: 'taken' });
      const saved = storage.save.mock.calls[0][1] as { id: string; status: string };
      expect(saved.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(saved.status).toBe('taken');
    });

    it('persiste une prise ponctuelle avec medicationName et sans treatmentId', async () => {
      const storage = makeStorageMock();
      TestBed.configureTestingModule({
        providers: [
          IntakeService,
          { provide: StorageService, useValue: storage },
          { provide: LocalSettingsService, useValue: makeSettingsMock() },
        ],
      });
      const svc = TestBed.inject(IntakeService);
      const at = new Date('2026-06-12T14:30:00');
      await svc.confirm({ medicationName: 'Spasfon', actualDose: '2 cp', confirmedAt: at, status: 'taken' });
      const saved = storage.save.mock.calls[0][1] as {
        medicationName?: string;
        treatmentId?: string;
        actualDose?: string;
        scheduledAt: Date;
        confirmedAt: Date;
      };
      expect(saved.medicationName).toBe('Spasfon');
      expect(saved.treatmentId).toBeUndefined();
      expect(saved.actualDose).toBe('2 cp');
      // scheduledAt s'aligne sur confirmedAt en l'absence de planification
      expect(saved.scheduledAt).toEqual(saved.confirmedAt);
    });
  });

  describe('edit', () => {
    it('ne fait rien si l\'entrée est introuvable', async () => {
      const storage = makeStorageMock();
      storage.get.mockResolvedValue(undefined);
      TestBed.configureTestingModule({
        providers: [
          IntakeService,
          { provide: StorageService, useValue: storage },
          { provide: LocalSettingsService, useValue: makeSettingsMock() },
        ],
      });
      const svc = TestBed.inject(IntakeService);
      await svc.edit({ id: 'absent', confirmedAt: new Date(), status: 'taken' });
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('met à jour le nom libre d\'une prise ponctuelle existante', async () => {
      const storage = makeStorageMock();
      storage.get.mockResolvedValue({
        id: 'adhoc-1', medicationName: 'Doliprane', scheduledAt: new Date(),
        confirmedAt: new Date(), createdAt: new Date(), status: 'taken',
      });
      TestBed.configureTestingModule({
        providers: [
          IntakeService,
          { provide: StorageService, useValue: storage },
          { provide: LocalSettingsService, useValue: makeSettingsMock() },
        ],
      });
      const svc = TestBed.inject(IntakeService);
      await svc.edit({ id: 'adhoc-1', confirmedAt: new Date(), status: 'taken', medicationName: 'Doliprane 1000', actualDose: '1 cp' });
      const saved = storage.save.mock.calls[0][1] as { medicationName?: string; actualDose?: string };
      expect(saved.medicationName).toBe('Doliprane 1000');
      expect(saved.actualDose).toBe('1 cp');
    });
  });

  describe('getJournalDay', () => {
    it('retourne les entrées de toutes les 4 catégories triées par timestamp', async () => {
      const meal = { id: 'm1', occurredAt: new Date('2026-01-01T12:00:00'), createdAt: new Date(), type: 'lunch', inputMode: 'text', items: [] };
      const symptom = { id: 's1', occurredAt: new Date('2026-01-01T08:00:00'), createdAt: new Date(), category: 'digestive', symptomKey: 'bloating', intensity: 5 };
      const storage = makeStorageMock();
      storage.getRange
        .mockResolvedValueOnce([meal])     // meals
        .mockResolvedValueOnce([symptom])  // symptoms
        .mockResolvedValueOnce([])          // intakes
        .mockResolvedValueOnce([]);         // notes
      TestBed.configureTestingModule({
        providers: [
          IntakeService,
          { provide: StorageService, useValue: storage },
          { provide: LocalSettingsService, useValue: makeSettingsMock() },
        ],
      });
      const svc = TestBed.inject(IntakeService);
      const entries = await svc.getJournalDay(new Date('2026-01-01'));
      expect(entries).toHaveLength(2);
      expect(entries[0].kind).toBe('symptom'); // 08h avant 12h
      expect(entries[1].kind).toBe('meal');
    });
  });

  describe('getSuggestions', () => {
    it('retourne [] si suggestions désactivées dans les préférences', async () => {
      TestBed.configureTestingModule({
        providers: [
          IntakeService,
          { provide: StorageService, useValue: makeStorageMock() },
          { provide: LocalSettingsService, useValue: makeSettingsMock(false) },
        ],
      });
      const svc = TestBed.inject(IntakeService);
      const result = await svc.getSuggestions(new Date(), []);
      expect(result).toEqual([]);
    });

    it('retourne [] si la date n\'est pas aujourd\'hui', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      TestBed.configureTestingModule({
        providers: [
          IntakeService,
          { provide: StorageService, useValue: makeStorageMock() },
          { provide: LocalSettingsService, useValue: makeSettingsMock(true) },
        ],
      });
      const svc = TestBed.inject(IntakeService);
      const result = await svc.getSuggestions(yesterday, []);
      expect(result).toEqual([]);
    });

    it('suggère no_recent_meal si aucun repas et il est ≥ 8h', async () => {
      vi.useFakeTimers({ now: new Date('2026-01-01T10:00:00') });
      TestBed.configureTestingModule({
        providers: [
          IntakeService,
          { provide: StorageService, useValue: makeStorageMock() },
          { provide: LocalSettingsService, useValue: makeSettingsMock(true) },
        ],
      });
      const svc = TestBed.inject(IntakeService);
      const result = await svc.getSuggestions(new Date('2026-01-01T10:00:00'), []);
      vi.useRealTimers();
      expect(result.some(s => s.type === 'no_recent_meal')).toBe(true);
    });
  });

  describe('getActiveCures', () => {
    it('retourne [] si aucune cure', async () => {
      const storage = makeStorageMock();
      storage.getAll.mockResolvedValue([]);
      TestBed.configureTestingModule({
        providers: [
          IntakeService,
          { provide: StorageService, useValue: storage },
          { provide: LocalSettingsService, useValue: makeSettingsMock() },
        ],
      });
      const svc = TestBed.inject(IntakeService);
      const result = await svc.getActiveCures();
      expect(result).toEqual([]);
    });

    it('clôture automatiquement une cure dont la durée est dépassée', async () => {
      const oldCure = {
        id: 'cure-1', name: 'Rifaximin', treatmentIds: [], status: 'active',
        durationDays: 7,
        startedAt: new Date('2026-01-01'),
        notes: '', createdAt: new Date(),
      };
      const storage = makeStorageMock();
      storage.getAll.mockResolvedValue([oldCure]);
      TestBed.configureTestingModule({
        providers: [
          IntakeService,
          { provide: StorageService, useValue: storage },
          { provide: LocalSettingsService, useValue: makeSettingsMock() },
        ],
      });
      const svc = TestBed.inject(IntakeService);
      const result = await svc.getActiveCures();
      expect(result).toHaveLength(0);
      expect(storage.save).toHaveBeenCalledWith('cures', expect.objectContaining({ status: 'completed' }));
    });
  });
});
