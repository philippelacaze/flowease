import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  Inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { LOCAL_SETTINGS_PORT } from '../../../../application/tokens';
import type { LocalSettingsRepository } from '../../../../domain/repositories/local-settings.repository';

const MESSAGES: Record<string, string> = {
  fr: 'Hors-ligne — les données sont sauvegardées localement',
  en: 'Offline — data is saved locally',
};

/**
 * Bandeau discret indiquant l'état hors-ligne de l'application.
 *
 * @remarks
 * Composant standalone affiché dans JournalHomeComponent quand navigator.onLine === false.
 * Écoute les événements 'online'/'offline' de la fenêtre pour réagir dynamiquement.
 * Le message s'adapte à la langue configurée via LOCAL_SETTINGS_PORT (FR/EN).
 * Principe SRP : ce composant gère uniquement la détection et l'affichage de l'état réseau.
 */
@Component({
  selector: 'app-offline-banner',
  standalone: true,
  imports: [NgIf, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './offline-banner.component.html',
  styleUrl: './offline-banner.component.scss',
})
export class OfflineBannerComponent implements OnInit, OnDestroy {
  protected isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  private readonly cdr = inject(ChangeDetectorRef);

  constructor(@Inject(LOCAL_SETTINGS_PORT) private readonly settings: LocalSettingsRepository) {}

  protected get offlineMessage(): string {
    const lang = this.settings.getLanguage();
    return MESSAGES[lang] ?? MESSAGES['fr'];
  }

  private readonly onOnline  = () => { this.isOnline = true;  this.cdr.markForCheck(); };
  private readonly onOffline = () => { this.isOnline = false; this.cdr.markForCheck(); };

  ngOnInit(): void {
    window.addEventListener('online',  this.onOnline);
    window.addEventListener('offline', this.onOffline);
  }

  ngOnDestroy(): void {
    window.removeEventListener('online',  this.onOnline);
    window.removeEventListener('offline', this.onOffline);
  }
}
