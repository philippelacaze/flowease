import { Component, Input, ChangeDetectionStrategy, Inject } from '@angular/core';

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
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './token-counter.component.html',
  styleUrl: './token-counter.component.scss',
})
export class TokenCounterComponent {
  /** Nombre de tokens estimé pour la session en cours. */
  @Input() sessionTokens = 0;

  constructor(@Inject(LOCAL_SETTINGS_PORT) private readonly settings: LocalSettingsRepository) {}

  protected get visible(): boolean {
    return this.sessionTokens > 0 && this.settings.getShowTokenCounter();
  }
}
