import { Injectable, signal } from '@angular/core';

/** 'error' = rouge (technique) | 'warning' = orange (fonctionnel) | 'success' = vert (validation) */
export type NotifType = 'error' | 'warning' | 'success';

export interface AppNotif {
  message: string;
  type: NotifType;
}

const AUTO_DISMISS_MS = 30_000;

/**
 * Service partagé de notification — accessible depuis toutes les couches.
 *
 * @remarks
 * Préoccupation transversale : les adapters l'alimentent, le shell l'affiche.
 * Singleton racine — une seule bannière active à la fois.
 * Auto-dismiss après 30 s ; annulé si une nouvelle notification arrive avant.
 * `type: 'error'`   → rouge  (erreur technique : réseau, HTTP, JSON invalide)
 * `type: 'warning'` → orange (retour fonctionnel : IA a répondu mais sans résultat)
 * `type: 'success'` → vert   (confirmation d'une action utilisateur)
 */
@Injectable({ providedIn: 'root' })
export class ErrorNotificationService {
  readonly current = signal<AppNotif | null>(null);

  private timer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Affiche une notification dans la bannière globale et programme son effacement.
   *
   * @param message - Message lisible (sans clé API ni détail technique)
   * @param type    - 'error' (défaut), 'warning' ou 'success'
   */
  show(message: string, type: NotifType = 'error'): void {
    this.clearTimer();
    this.current.set({ message, type });
    this.timer = setTimeout(() => this.dismiss(), AUTO_DISMISS_MS);
  }

  /** Raccourci pour un retour fonctionnel de l'IA sans résultat (orange). */
  showWarning(message: string): void {
    this.show(message, 'warning');
  }

  /** Raccourci pour une confirmation utilisateur (vert). */
  showSuccess(message: string): void {
    this.show(message, 'success');
  }

  /** Ferme la bannière et annule le timer. */
  dismiss(): void {
    this.clearTimer();
    this.current.set(null);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
