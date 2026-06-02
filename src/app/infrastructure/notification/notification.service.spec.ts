import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { NotificationService } from './notification.service';

// --- Mock de l'API Notification browser ---
// Object.defineProperty est requis pour un getter dynamique sur mockPermission.
// Object.assign copie la valeur au moment de l'appel, ce qui n'est pas dynamique.

let mockPermission: NotificationPermission = 'default';
const mockNotificationConstructor = vi.fn();
const mockRequestPermission = vi.fn();

function setupNotificationMock(): void {
  Object.defineProperty(globalThis, 'Notification', {
    value: mockNotificationConstructor,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis.Notification, 'permission', {
    get: () => mockPermission,
    configurable: true,
  });
  Object.defineProperty(globalThis.Notification, 'requestPermission', {
    value: mockRequestPermission,
    writable: true,
    configurable: true,
  });
}

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    mockPermission = 'default';
    mockNotificationConstructor.mockClear();
    mockRequestPermission.mockClear().mockResolvedValue('granted');
    setupNotificationMock();
    vi.useFakeTimers();
    service = new NotificationService();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('getPermissionStatus', () => {
    it('retourne le statut courant du navigateur', () => {
      mockPermission = 'denied';
      expect(service.getPermissionStatus()).toBe('denied');
    });

    it('retourne granted quand permission accordée', () => {
      mockPermission = 'granted';
      expect(service.getPermissionStatus()).toBe('granted');
    });

    it('retourne default avant toute demande', () => {
      expect(service.getPermissionStatus()).toBe('default');
    });
  });

  describe('requestPermission', () => {
    it('délègue à Notification.requestPermission', async () => {
      await service.requestPermission();
      expect(mockRequestPermission).toHaveBeenCalledOnce();
    });

    it('retourne granted si accordé', async () => {
      mockRequestPermission.mockResolvedValue('granted');
      expect(await service.requestPermission()).toBe('granted');
    });

    it('retourne denied si refusé', async () => {
      mockRequestPermission.mockResolvedValue('denied');
      expect(await service.requestPermission()).toBe('denied');
    });
  });

  describe('scheduleReminders — contrôle de permission', () => {
    it('ne planifie rien si la permission est denied', () => {
      mockPermission = 'denied';
      const spy = vi.spyOn(globalThis, 'setTimeout');
      service.scheduleReminders('t1', 'Rifaximine', ['09:00']);
      expect(spy).not.toHaveBeenCalled();
    });

    it('ne planifie rien si la permission est default', () => {
      mockPermission = 'default';
      const spy = vi.spyOn(globalThis, 'setTimeout');
      service.scheduleReminders('t1', 'Rifaximine', ['09:00']);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('scheduleReminders — planification', () => {
    beforeEach(() => {
      mockPermission = 'granted';
      vi.setSystemTime(new Date('2024-01-01T08:00:00'));
    });

    it('planifie un timer pour une heure future', () => {
      const spy = vi.spyOn(globalThis, 'setTimeout');
      service.scheduleReminders('t1', 'Rifaximine', ['09:00']);
      expect(spy).toHaveBeenCalledOnce();
    });

    it('planifie plusieurs timers pour plusieurs heures futures', () => {
      const spy = vi.spyOn(globalThis, 'setTimeout');
      service.scheduleReminders('t1', 'Rifaximine', ['09:00', '14:00']);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('ignore les heures déjà passées', () => {
      const spy = vi.spyOn(globalThis, 'setTimeout');
      service.scheduleReminders('t1', 'Rifaximine', ['07:00', '07:59']); // avant 08:00
      expect(spy).not.toHaveBeenCalled();
    });

    it('le callback crée une Notification avec le nom du traitement', () => {
      const spy = vi.spyOn(globalThis, 'setTimeout');
      service.scheduleReminders('t1', 'Rifaximine', ['09:00']);

      const callback = spy.mock.calls[0]?.[0] as (() => void) | undefined;
      expect(callback).toBeDefined();
      callback?.();

      expect(mockNotificationConstructor).toHaveBeenCalledWith(
        'Rappel — Rifaximine',
        expect.objectContaining({ body: expect.stringContaining('09:00') }),
      );
    });

    it('ne stocke pas les timers pour lesquels il n\'y a aucun heure planifiable', () => {
      const cancelSpy = vi.spyOn(service, 'cancelReminders');
      service.scheduleReminders('t1', 'Rifaximine', ['07:00']); // passé, rien planifié
      // cancelReminders est toujours appelé (pour annuler d'éventuels timers précédents)
      expect(cancelSpy).toHaveBeenCalledWith('t1');
    });
  });

  describe('cancelReminders', () => {
    beforeEach(() => {
      mockPermission = 'granted';
      vi.setSystemTime(new Date('2024-01-01T08:00:00'));
    });

    it('n\'échoue pas si le traitement n\'avait aucun timer', () => {
      expect(() => service.cancelReminders('inexistant')).not.toThrow();
    });

    it('appelle clearTimeout pour chaque timer planifié', () => {
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

      service.scheduleReminders('t1', 'Rifaximine', ['09:00', '14:00']);
      const timerIds = setTimeoutSpy.mock.results.map(r => r.value);

      service.cancelReminders('t1');

      timerIds.forEach(id => {
        expect(clearTimeoutSpy).toHaveBeenCalledWith(id);
      });
    });

    it('re-schedule annule les anciens timers (pas de doublon)', () => {
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

      service.scheduleReminders('t1', 'Rifaximine', ['09:00']);
      const firstTimerId = setTimeoutSpy.mock.results[0]?.value;

      service.scheduleReminders('t1', 'Rifaximine', ['10:00']);

      expect(clearTimeoutSpy).toHaveBeenCalledWith(firstTimerId);
    });
  });
});
