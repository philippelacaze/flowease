import { Injectable, inject } from '@angular/core';
import { STORAGE_PORT, NOTIFICATION_PORT } from '../tokens';
import type { StorageRepository } from '../../domain/repositories/storage.repository';
import type { NotificationPort } from '../../domain/repositories/notification.port';
import type { TreatmentEntity } from '../../domain/entities/treatment.entity';

/**
 * Replanifie les rappels pour tous les traitements actifs avec des rappels activés.
 *
 * @remarks
 * Responsabilité unique : synchroniser les timers de notification avec
 * l'état persisté des traitements. Appelé à chaque ouverture du journal
 * pour compenser la perte des timers setTimeout lors de la fermeture de l'app.
 * La planification effective n'a lieu que si la permission 'granted' est accordée.
 */
@Injectable({ providedIn: 'root' })
export class ScheduleAllRemindersUseCase {
  private readonly storage = inject<StorageRepository<TreatmentEntity>>(STORAGE_PORT as never);
  private readonly notifications = inject<NotificationPort>(NOTIFICATION_PORT);

  /**
   * Lit tous les traitements actifs et planifie leurs rappels pour aujourd'hui.
   *
   * @remarks
   * Sans effet si aucun traitement actif n'a de rappel activé,
   * ou si la permission de notification n'est pas 'granted'.
   */
  async execute(): Promise<void> {
    const treatments = await this.storage.getAll('treatments') as TreatmentEntity[];
    for (const treatment of treatments) {
      if (treatment.active && treatment.reminder.enabled && treatment.reminder.times.length > 0) {
        this.notifications.scheduleReminders(treatment.id, treatment.name, treatment.reminder.times);
      }
    }
  }
}
