import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { LocalSettingsService } from '../../../core/services/local-settings.service';

const MESSAGES: Record<string, string> = {
  fr: 'Hors-ligne — les données sont sauvegardées localement',
  en: 'Offline — data is saved locally',
};

@Component({
  selector: 'app-offline-banner',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './offline-banner.component.html',
  styleUrl: './offline-banner.component.scss',
})
export class OfflineBannerComponent implements OnInit, OnDestroy {
  protected isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly settings = inject(LocalSettingsService);

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
