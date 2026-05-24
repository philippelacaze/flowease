import { Injectable, signal } from '@angular/core';

/**
 * Service partagé de notification d'erreur — accessible depuis toutes les couches.
 *
 * @remarks
 * Préoccupation transversale (cross-cutting concern) : ni domain, ni application,
 * ni infrastructure, ni presentation. Les adapters l'alimentent, le shell l'affiche.
 * Singleton racine — une seule bannière active à la fois.
 */
@Injectable({ providedIn: 'root' })
export class ErrorNotificationService {
  readonly message = signal<string | null>(null);

  /**
   * Affiche un message d'erreur dans la bannière globale.
   * @param message - Message lisible par l'utilisateur (sans clé API ni détail technique)
   */
  show(message: string): void {
    this.message.set(message);
  }

  /** Ferme la bannière. */
  dismiss(): void {
    this.message.set(null);
  }
}
