import { Component, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { LocalSettingsService } from '../../../core/services/local-settings.service';
import { SettingsService } from '../services/settings.service';

type ApiKeyStatus = 'idle' | 'testing' | 'valid' | 'invalid';


/**
 * Page de configuration de la clé API Anthropic.
 *
 * @remarks
 * Respecte SRP — seule page autorisée à accéder à LocalSettingsService
 * directement depuis la présentation (exception justifiée : gestion de la clé API).
 * La clé n'est jamais loguée ni affichée en clair après saisie.
 */
@Component({
  selector: 'app-api-key',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule
],
  templateUrl: './api-key.component.html',
  styleUrl: './api-key.component.scss',
})
export class ApiKeyComponent {
  private readonly settings = inject(LocalSettingsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly settingsService = inject(SettingsService);

  protected apiKeyInput = '';
  protected showKey = false;
  protected hasKey = signal(this.settings.hasApiKey());
  protected testStatus = signal<ApiKeyStatus>('idle');
  protected testError = signal<string | null>(null);

  protected async onTest(): Promise<void> {
    const keyToTest = this.apiKeyInput || this.settings.getApiKey() || '';
    if (!keyToTest) return;
    this.testStatus.set('testing');
    this.testError.set(null);
    const result = await this.settingsService.testApiKey(keyToTest);
    if (result.ok) {
      this.testStatus.set('valid');
    } else {
      this.testStatus.set('invalid');
      this.testError.set(result.errorMessage ?? 'Erreur inconnue');
    }
  }

  protected onSave(): void {
    if (!this.apiKeyInput) return;
    this.settings.setApiKey(this.apiKeyInput);
    this.hasKey.set(true);
    this.apiKeyInput = '';
    this.testStatus.set('idle');
    this.testError.set(null);
    this.snackBar.open('Clé API enregistrée', 'OK', { duration: 2000 });
  }

  protected onRemove(): void {
    this.settings.clearApiKey();
    this.hasKey.set(false);
    this.testStatus.set('idle');
    this.testError.set(null);
    this.snackBar.open('Clé API supprimée', 'OK', { duration: 2000 });
  }
}
