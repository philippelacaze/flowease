/**
 * Port de gestion des rappels via Web Notifications API.
 *
 * @remarks
 * Interface pure domain — aucune dépendance externe.
 * Implémentée par NotificationService dans infrastructure/.
 * Retourne 'unsupported' si le navigateur ne supporte pas l'API Notification.
 */

/** Résultat de la demande de permission de notification. */
export type NotificationPermissionResult = 'granted' | 'denied' | 'default' | 'unsupported';

export interface NotificationPort {
  /**
   * Demande la permission d'afficher des notifications à l'utilisateur.
   *
   * @returns Le statut de permission accordé
   */
  requestPermission(): Promise<NotificationPermissionResult>;

  /**
   * Programme les rappels journaliers pour un traitement.
   *
   * @remarks
   * Les timers sont planifiés pour les occurrences restantes de la journée en cours.
   * Sans effet si la permission n'est pas 'granted'.
   *
   * @param treatmentId - Identifiant unique du traitement
   * @param treatmentName - Nom affiché dans la notification
   * @param times - Heures de rappel au format "HH:MM"
   */
  scheduleReminders(treatmentId: string, treatmentName: string, times: readonly string[]): void;

  /**
   * Annule tous les rappels planifiés pour un traitement.
   *
   * @param treatmentId - Identifiant du traitement dont les rappels sont annulés
   */
  cancelReminders(treatmentId: string): void;

  /**
   * Retourne le statut actuel de permission de notification.
   *
   * @returns 'unsupported' si l'API Notification n'est pas disponible
   */
  getPermissionStatus(): NotificationPermissionResult;
}
