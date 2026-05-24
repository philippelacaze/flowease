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
  template: `
    @if (notification.message()) {
      <div class="error-banner" role="alert" aria-live="assertive" data-testid="error-banner">
        <mat-icon class="banner-icon" aria-hidden="true">error_outline</mat-icon>
        <span class="banner-message">{{ notification.message() }}</span>
        <button
          mat-icon-button
          class="banner-close"
          aria-label="Fermer le message d'erreur"
          (click)="notification.dismiss()">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    }
  `,
  styles: [`
    .error-banner {
      position: fixed;
      bottom: 64px;
      left: 12px;
      right: 12px;
      z-index: 2000;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 8px 12px 14px;
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
      border-radius: 10px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.18);
      font-size: 0.88rem;
      line-height: 1.4;
    }
    .banner-icon {
      flex-shrink: 0;
      font-size: 20px;
      width: 20px;
      height: 20px;
      margin-top: 1px;
    }
    .banner-message {
      flex: 1;
      word-break: break-word;
    }
    .banner-close {
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      line-height: 36px;
      color: var(--mat-sys-on-error-container);
      margin: -4px -4px 0 0;
    }

    @media (min-width: 768px) {
      .error-banner {
        bottom: 24px;
        left: auto;
        right: 24px;
        max-width: 420px;
      }
    }
  `],
})
export class ErrorBannerComponent {
  protected readonly notification = inject(ErrorNotificationService);
}
