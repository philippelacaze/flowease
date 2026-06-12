import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { IntakeService, type JournalEntry } from './intake.service';
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

function makeSettingsMock(coachSuggestions = false, dismissed: string[] = []) {
  return {
    getCoachSuggestions: vi.fn().mockReturnValue(coachSuggestions),
    getDismissedReminders: vi.fn().mockReturnValue(dismissed),
    dismissReminder: vi.fn(),
  };
}

function makeTreatment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'treat-1',
    name: 'Rifaximine',
    category: 'antibiotic',
    mode: 'oral',
    dosage: '550',
    unit: 'mg',
    frequency: 2,
    reminder: { enabled: true, times: ['08:00'], soundEnabled: false },
    notes: '',
    active: true,
    startedAt: new Date('2026-01-01'),
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

/** "HH:MM" décalé de `offsetMin` minutes par rapport à maintenant. */
function timeFromNow(offsetMin: number): string {
  const d = new Date(Date.now() + offsetMin * 60_000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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

  describe('delete', () => {
    it('supprime la prise du store intakes via son id', async () => {
      const storage = makeStorageMock();
      TestBed.configureTestingModule({
        providers: [
          IntakeService,
          { provide: StorageService, useValue: storage },
          { provide: LocalSettingsService, useValue: makeSettingsMock() },
        ],
      });
      const svc = TestBed.inject(IntakeService);
      await svc.delete('intake-42');
      expect(storage.delete).toHaveBeenCalledWith('intakes', 'intake-42');
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

  describe('getDueReminders', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-12T12:00:00')); // midi, évite tout passage de minuit
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    function setupSvc(treatments: unknown[], dismissed: string[] = []) {
      const storage = makeStorageMock();
      storage.getAll.mockResolvedValue(treatments);
      TestBed.configureTestingModule({
        providers: [
          IntakeService,
          { provide: StorageService, useValue: storage },
          { provide: LocalSettingsService, useValue: makeSettingsMock(false, dismissed) },
        ],
      });
      return TestBed.inject(IntakeService);
    }

    function todayKey(): string {
      const n = new Date();
      return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
    }

    it('retourne un rappel à moins de 30 min avant l\'heure prévue', async () => {
      const time = timeFromNow(10);
      const svc = setupSvc([makeTreatment({ reminder: { enabled: true, times: [time], soundEnabled: false } })]);
      const reminders = await svc.getDueReminders(new Date(), []);
      expect(reminders).toHaveLength(1);
      expect(reminders[0].treatmentId).toBe('treat-1');
      expect(reminders[0].time).toBe(time);
      expect(reminders[0].dosage).toBe('550 mg');
    });

    it('ne retourne pas de rappel à plus de 30 min de l\'heure prévue', async () => {
      const time = timeFromNow(60);
      const svc = setupSvc([makeTreatment({ reminder: { enabled: true, times: [time], soundEnabled: false } })]);
      expect(await svc.getDueReminders(new Date(), [])).toHaveLength(0);
    });

    it('ignore les traitements dont les rappels sont désactivés', async () => {
      const time = timeFromNow(5);
      const svc = setupSvc([makeTreatment({ reminder: { enabled: false, times: [time], soundEnabled: false } })]);
      expect(await svc.getDueReminders(new Date(), [])).toHaveLength(0);
    });

    it('ignore un créneau déjà pris (prise existante à la même heure)', async () => {
      const time = timeFromNow(5);
      const svc = setupSvc([makeTreatment({ reminder: { enabled: true, times: [time], soundEnabled: false } })]);
      const [h, m] = time.split(':').map(Number);
      const scheduledAt = new Date();
      scheduledAt.setHours(h, m, 0, 0);
      const entries = [
        { kind: 'intake', data: { id: 'i1', treatmentId: 'treat-1', scheduledAt, confirmedAt: new Date(), createdAt: new Date(), status: 'taken' } },
      ] as unknown as JournalEntry[];
      expect(await svc.getDueReminders(new Date(), entries)).toHaveLength(0);
    });

    it('ignore un créneau annulé (présent dans les rappels annulés)', async () => {
      const time = timeFromNow(5);
      const key = `treat-1|${todayKey()}|${time}`;
      const svc = setupSvc(
        [makeTreatment({ reminder: { enabled: true, times: [time], soundEnabled: false } })],
        [key],
      );
      expect(await svc.getDueReminders(new Date(), [])).toHaveLength(0);
    });

    it('retourne [] si la date n\'est pas aujourd\'hui', async () => {
      const time = timeFromNow(5);
      const svc = setupSvc([makeTreatment({ reminder: { enabled: true, times: [time], soundEnabled: false } })]);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(await svc.getDueReminders(yesterday, [])).toHaveLength(0);
    });
  });

  describe('dismissReminder', () => {
    it('délègue à LocalSettingsService.dismissReminder', () => {
      const settings = makeSettingsMock();
      TestBed.configureTestingModule({
        providers: [
          IntakeService,
          { provide: StorageService, useValue: makeStorageMock() },
          { provide: LocalSettingsService, useValue: settings },
        ],
      });
      const svc = TestBed.inject(IntakeService);
      svc.dismissReminder('treat-1|2026-06-12|08:00');
      expect(settings.dismissReminder).toHaveBeenCalledWith('treat-1|2026-06-12|08:00');
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
