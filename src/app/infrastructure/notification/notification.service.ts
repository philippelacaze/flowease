import { Injectable } from '@angular/core';
import type { NotificationPort, NotificationPermissionResult } from '../../domain/repositories/notification.port';

/**
 * Implémentation des rappels de traitement via Web Notifications API.
 *
 * @remarks
 * Responsabilité unique : gérer le cycle de vie des notifications browser
 * (permission, planification via setTimeout, annulation).
 * Les rappels sont planifiés pour les heures restantes de la journée en cours.
 * Ils doivent être re-planifiés à chaque ouverture de l'application
 * via ScheduleAllRemindersUseCase.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService implements NotificationPort {
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>[]>();

  /**
   * Demande la permission browser de diffuser des notifications.
   *
   * @returns Le statut de permission ou 'unsupported' si l'API est absente
   */
  async requestPermission(): Promise<NotificationPermissionResult> {
    if (!('Notification' in window)) return 'unsupported';
    const result = await Notification.requestPermission();
    return result as NotificationPermissionResult;
  }

  /**
   * Retourne le statut de permission actuel sans déclencher de dialogue.
   *
   * @returns 'unsupported' si l'API Notification n'est pas disponible dans ce navigateur
   */
  getPermissionStatus(): NotificationPermissionResult {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission as NotificationPermissionResult;
  }

  /**
   * Programme un setTimeout par heure de rappel pour le reste de la journée.
   *
   * @remarks
   * Annule les timers précédents du même traitement avant de replanifier.
   * Sans effet si la permission n'est pas 'granted'.
   *
   * @param treatmentId - Identifiant du traitement (clé de stockage des timers)
   * @param treatmentName - Nom affiché dans le titre de la notification
   * @param times - Heures au format "HH:MM"
   */
  scheduleReminders(treatmentId: string, treatmentName: string, times: readonly string[]): void {
    this.cancelReminders(treatmentId);
    if (this.getPermissionStatus() !== 'granted') return;

    const now = new Date();
    const ids: ReturnType<typeof setTimeout>[] = [];

    for (const time of times) {
      const [h, m] = time.split(':').map(Number);
      const target = new Date(now);
      target.setHours(h, m, 0, 0);
      if (target <= now) continue; // heure déjà passée aujourd'hui

      const delay = target.getTime() - now.getTime();
      const id = setTimeout(() => {
        try {
          new Notification(`Rappel — ${treatmentName}`, {
            body: `Heure de prendre votre traitement (${time})`,
            icon: '/icons/icon-192x192.png',
          });
        } catch {
          // permission révoquée entre la planification et le déclenchement
        }
      }, delay);
      ids.push(id);
    }

    if (ids.length > 0) {
      this.timers.set(treatmentId, ids);
    }
  }

  /**
   * Annule tous les timers de rappel d'un traitement.
   *
   * @param treatmentId - Identifiant du traitement
   */
  cancelReminders(treatmentId: string): void {
    const ids = this.timers.get(treatmentId) ?? [];
    ids.forEach(id => clearTimeout(id));
    this.timers.delete(treatmentId);
  }
}
