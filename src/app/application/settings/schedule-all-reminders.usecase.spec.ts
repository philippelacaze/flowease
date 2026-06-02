import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ScheduleAllRemindersUseCase } from './schedule-all-reminders.usecase';
import { STORAGE_PORT, NOTIFICATION_PORT } from '../tokens';
import type { TreatmentEntity } from '../../domain/entities/treatment.entity';

function makeStorage(treatments: TreatmentEntity[]) {
  return {
    get: vi.fn(),
    getAll: vi.fn().mockResolvedValue(treatments),
    getRange: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
  };
}

function makeNotificationPort() {
  return {
    requestPermission: vi.fn().mockResolvedValue('granted'),
    scheduleReminders: vi.fn(),
    cancelReminders: vi.fn(),
    getPermissionStatus: vi.fn().mockReturnValue('granted'),
  };
}

function makeTreatment(overrides: Partial<TreatmentEntity> = {}): TreatmentEntity {
  return {
    id: 'treatment-1',
    name: 'Rifaximine',
    category: 'antibiotic',
    mode: 'oral',
    dosage: '550mg',
    unit: 'mg',
    frequency: 2,
    reminder: { enabled: true, times: ['08:00', '20:00'], soundEnabled: false },
    notes: '',
    active: true,
    startedAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

describe('ScheduleAllRemindersUseCase', () => {
  let notif: ReturnType<typeof makeNotificationPort>;

  describe('traitement actif avec rappels activés', () => {
    beforeEach(() => {
      notif = makeNotificationPort();
      TestBed.configureTestingModule({
        providers: [
          ScheduleAllRemindersUseCase,
          { provide: STORAGE_PORT, useValue: makeStorage([makeTreatment()]) },
          { provide: NOTIFICATION_PORT, useValue: notif },
        ],
      });
    });

    it('appelle scheduleReminders avec les bonnes heures', async () => {
      const uc = TestBed.inject(ScheduleAllRemindersUseCase);
      await uc.execute();
      expect(notif.scheduleReminders).toHaveBeenCalledWith('treatment-1', 'Rifaximine', ['08:00', '20:00']);
    });
  });

  describe('traitement inactif', () => {
    beforeEach(() => {
      notif = makeNotificationPort();
      TestBed.configureTestingModule({
        providers: [
          ScheduleAllRemindersUseCase,
          { provide: STORAGE_PORT, useValue: makeStorage([makeTreatment({ active: false })]) },
          { provide: NOTIFICATION_PORT, useValue: notif },
        ],
      });
    });

    it('ne planifie pas de rappels', async () => {
      const uc = TestBed.inject(ScheduleAllRemindersUseCase);
      await uc.execute();
      expect(notif.scheduleReminders).not.toHaveBeenCalled();
    });
  });

  describe('traitement actif mais rappels désactivés', () => {
    beforeEach(() => {
      notif = makeNotificationPort();
      TestBed.configureTestingModule({
        providers: [
          ScheduleAllRemindersUseCase,
          {
            provide: STORAGE_PORT,
            useValue: makeStorage([
              makeTreatment({ reminder: { enabled: false, times: [], soundEnabled: false } }),
            ]),
          },
          { provide: NOTIFICATION_PORT, useValue: notif },
        ],
      });
    });

    it('ne planifie pas de rappels', async () => {
      const uc = TestBed.inject(ScheduleAllRemindersUseCase);
      await uc.execute();
      expect(notif.scheduleReminders).not.toHaveBeenCalled();
    });
  });

  describe('traitement actif avec rappels activés mais liste vide', () => {
    beforeEach(() => {
      notif = makeNotificationPort();
      TestBed.configureTestingModule({
        providers: [
          ScheduleAllRemindersUseCase,
          {
            provide: STORAGE_PORT,
            useValue: makeStorage([
              makeTreatment({ reminder: { enabled: true, times: [], soundEnabled: false } }),
            ]),
          },
          { provide: NOTIFICATION_PORT, useValue: notif },
        ],
      });
    });

    it('ne planifie pas de rappels', async () => {
      const uc = TestBed.inject(ScheduleAllRemindersUseCase);
      await uc.execute();
      expect(notif.scheduleReminders).not.toHaveBeenCalled();
    });
  });

  describe('plusieurs traitements actifs', () => {
    beforeEach(() => {
      notif = makeNotificationPort();
      TestBed.configureTestingModule({
        providers: [
          ScheduleAllRemindersUseCase,
          {
            provide: STORAGE_PORT,
            useValue: makeStorage([
              makeTreatment({ id: 't1', name: 'Rifaximine', reminder: { enabled: true, times: ['08:00'], soundEnabled: false } }),
              makeTreatment({ id: 't2', name: 'Probiotique', reminder: { enabled: true, times: ['12:00'], soundEnabled: false } }),
              makeTreatment({ id: 't3', name: 'Inactif', active: false, reminder: { enabled: true, times: ['09:00'], soundEnabled: false } }),
            ]),
          },
          { provide: NOTIFICATION_PORT, useValue: notif },
        ],
      });
    });

    it('planifie uniquement les traitements actifs (2 sur 3)', async () => {
      const uc = TestBed.inject(ScheduleAllRemindersUseCase);
      await uc.execute();
      expect(notif.scheduleReminders).toHaveBeenCalledTimes(2);
    });

    it('planifie le premier traitement avec ses heures', async () => {
      const uc = TestBed.inject(ScheduleAllRemindersUseCase);
      await uc.execute();
      expect(notif.scheduleReminders).toHaveBeenCalledWith('t1', 'Rifaximine', ['08:00']);
    });
  });

  describe('aucun traitement en base', () => {
    beforeEach(() => {
      notif = makeNotificationPort();
      TestBed.configureTestingModule({
        providers: [
          ScheduleAllRemindersUseCase,
          { provide: STORAGE_PORT, useValue: makeStorage([]) },
          { provide: NOTIFICATION_PORT, useValue: notif },
        ],
      });
    });

    it('ne lève pas d\'erreur et ne planifie rien', async () => {
      const uc = TestBed.inject(ScheduleAllRemindersUseCase);
      await expect(uc.execute()).resolves.toBeUndefined();
      expect(notif.scheduleReminders).not.toHaveBeenCalled();
    });
  });
});
