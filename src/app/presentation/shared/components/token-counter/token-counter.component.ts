import { Component, Input, ChangeDetectionStrategy, Inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { LOCAL_SETTINGS_PORT } from '../../../../application/tokens';
import type { LocalSettingsRepository } from '../../../../domain/repositories/local-settings.repository';

/**
 * Affiche le nombre de tokens estimé pour la session Coach en cours.
 *
 * @remarks
 * Composant partagé utilisé par CoachChatComponent.
 * N'affiche rien si sessionTokens === 0 ou si getShowTokenCounter() est false
 * dans les préférences (LOCAL_SETTINGS_PORT).
 * Respecte SRP : affichage du compteur de tokens uniquement.
 */
@Component({
  selector: 'app-token-counter',
  standalone: true,
  imports: [NgIf],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      *ngIf="visible"
      class="token-counter"
      aria-label="Estimation des tokens utilisés cette session"
      data-testid="token-counter"
    >
      ~{{ sessionTokens }} tokens cette session
    </span>
  `,
  styles: [`
    .token-counter {
      display: inline-block;
      font-size: 11px;
      color: var(--mat-sys-outline);
      opacity: 0.7;
      padding: 2px 8px;
    }
  `],
})
export class TokenCounterComponent {
  /** Nombre de tokens estimé pour la session en cours. */
  @Input() sessionTokens = 0;

  constructor(@Inject(LOCAL_SETTINGS_PORT) private readonly settings: LocalSettingsRepository) {}

  protected get visible(): boolean {
    return this.sessionTokens > 0 && this.settings.getShowTokenCounter();
  }
}
