import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ErrorNotificationService } from '../../../../core/error-notification.service';

/**
 * Bannière d'erreur globale dismissible.
 *
 * @remarks
 * Positionnée en bas de l'écran via position:fixed dans le shell.
 * Lit ErrorNotificationService (signal) — s'affiche ou disparaît réactivement.
 * Respecte SRP : affichage uniquement, pas de logique métier.
 */
@Component({
  selector: 'app-error-banner',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './error-banner.component.html',
  styleUrl: './error-banner.component.scss',
})
export class ErrorBannerComponent {
  protected readonly notification = inject(ErrorNotificationService);
}
