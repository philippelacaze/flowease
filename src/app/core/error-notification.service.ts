import { Injectable, signal } from '@angular/core';

/** Distingue une erreur technique (rouge) d'un retour fonctionnel de l'IA (bleu). */
export type NotifType = 'error' | 'info';

export interface AppNotif {
  message: string;
  type: NotifType;
}

/**
 * Service partagé de notification — accessible depuis toutes les couches.
 *
 * @remarks
 * Préoccupation transversale : les adapters l'alimentent, le shell l'affiche.
 * Singleton racine — une seule bannière active à la fois.
 * `type: 'error'` → fond rouge (erreur technique).
 * `type: 'info'`  → fond bleu (retour fonctionnel de l'IA, ex. "pas de repas détecté").
 */
@Injectable({ providedIn: 'root' })
export class ErrorNotificationService {
  readonly current = signal<AppNotif | null>(null);

  /**
   * Affiche une notification dans la bannière globale.
   *
   * @param message - Message lisible (sans clé API ni détail technique)
   * @param type    - 'error' (défaut) ou 'info'
   */
  show(message: string, type: NotifType = 'error'): void {
    this.current.set({ message, type });
  }

  /**
   * Raccourci pour afficher un retour fonctionnel de l'IA (type 'info').
   *
   * @param message - Explication retournée par l'IA
   */
  showInfo(message: string): void {
    this.current.set({ message, type: 'info' });
  }

  /** Ferme la bannière. */
  dismiss(): void {
    this.current.set(null);
  }
}
