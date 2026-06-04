import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { LocalSettingsService } from '../../../core/services/local-settings.service';

@Component({
  selector: 'app-token-counter',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './token-counter.component.html',
  styleUrl: './token-counter.component.scss',
})
export class TokenCounterComponent {
  @Input() sessionTokens = 0;

  private readonly settings = inject(LocalSettingsService);

  protected get visible(): boolean {
    return this.sessionTokens > 0 && this.settings.getShowTokenCounter();
  }
}
