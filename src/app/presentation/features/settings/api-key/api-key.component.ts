import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { LocalSettingsAdapter } from '../../../../infrastructure/storage/local-settings.adapter';

type ApiKeyStatus = 'idle' | 'testing' | 'valid' | 'invalid';

/**
 * Page de configuration de la clé API Anthropic.
 *
 * @remarks
 * Respecte SRP — seule page autorisée à accéder à LocalSettingsAdapter
 * directement depuis la présentation (exception justifiée : gestion de la clé API).
 * La clé n'est jamais loguée ni affichée en clair après saisie.
 */
@Component({
  selector: 'app-api-key',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  template: `
    <div class="api-key-page">
      <header class="page-header">
        <a mat-icon-button routerLink=".." aria-label="Retour aux paramètres">
          <mat-icon>arrow_back</mat-icon>
        </a>
        <h1>Clé API Claude</h1>
      </header>

      <div class="content">
        <!-- Statut actuel -->
        <div class="status-row" role="status" data-testid="api-key-status">
          @if (hasKey()) {
            <mat-chip color="primary" highlighted data-testid="status-configured">
              <mat-icon matChipAvatar>check_circle</mat-icon>
              Clé configurée
            </mat-chip>
          } @else {
            <mat-chip data-testid="status-not-configured">
              <mat-icon matChipAvatar>warning</mat-icon>
              Aucune clé configurée
            </mat-chip>
          }
        </div>

        <!-- Champ de saisie -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Clé API Anthropic</mat-label>
          <input
            matInput
            [type]="showKey ? 'text' : 'password'"
            [(ngModel)]="apiKeyInput"
            placeholder="sk-ant-api03-..."
            aria-label="Clé API Anthropic"
            data-testid="api-key-input"
            autocomplete="off"
            spellcheck="false" />
          <button
            matSuffix
            mat-icon-button
            type="button"
            (click)="showKey = !showKey"
            [attr.aria-label]="showKey ? 'Masquer la clé' : 'Afficher la clé'">
            <mat-icon>{{ showKey ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
        </mat-form-field>

        <!-- Résultat du test -->
        @if (testStatus() === 'valid') {
          <p class="status-msg success" role="status" data-testid="test-valid">
            <mat-icon>check_circle</mat-icon>
            Format valide — enregistrez pour activer Claude.
          </p>
        } @else if (testStatus() === 'invalid') {
          <p class="status-msg error" role="alert" data-testid="test-invalid">
            <mat-icon>error</mat-icon>
            Format invalide — la clé doit commencer par <code>sk-ant-</code>.
          </p>
        }

        <!-- Actions -->
        <div class="actions">
          <button
            mat-stroked-button
            (click)="onTest()"
            [disabled]="!apiKeyInput || testStatus() === 'testing'"
            aria-label="Vérifier le format de la clé API"
            data-testid="test-btn">
            @if (testStatus() === 'testing') {
              <mat-spinner diameter="18" />
            } @else {
              <mat-icon>wifi</mat-icon>
            }
            Tester
          </button>

          <button
            mat-raised-button
            color="primary"
            (click)="onSave()"
            [disabled]="!apiKeyInput"
            aria-label="Enregistrer la clé API"
            data-testid="save-key-btn"
            class="action-btn">
            <mat-icon>save</mat-icon>
            Enregistrer
          </button>

          @if (hasKey()) {
            <button
              mat-stroked-button
              color="warn"
              (click)="onRemove()"
              aria-label="Supprimer la clé API"
              data-testid="remove-key-btn"
              class="action-btn">
              <mat-icon>delete</mat-icon>
              Supprimer
            </button>
          }
        </div>

        <!-- Lien documentation -->
        <div class="doc-link">
          <mat-icon class="doc-icon">open_in_new</mat-icon>
          <a
            href="https://console.anthropic.com/account/keys"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Obtenir une clé API sur Anthropic (nouvel onglet)">
            Obtenir une clé API sur console.anthropic.com
          </a>
        </div>

        <p class="privacy-note">
          <mat-icon class="small-icon">lock</mat-icon>
          La clé est stockée uniquement dans votre navigateur (localStorage).
          Elle n'est jamais envoyée à nos serveurs.
        </p>
      </div>
    </div>
  `,
  styles: [`
    .api-key-page {
      max-width: 640px;
      margin: 0 auto;
      padding: 16px;
    }
    .page-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 24px;
    }
    .page-header h1 {
      font-size: 1.4rem;
      margin: 0;
    }
    .content {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .status-row {
      display: flex;
      align-items: center;
    }
    .full-width {
      width: 100%;
    }
    .status-msg {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
      margin: 0;
    }
    .status-msg.success { color: var(--mat-sys-tertiary); }
    .status-msg.error { color: var(--mat-sys-error); }
    .actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .action-btn {
      min-height: 44px;
    }
    .doc-link {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.9rem;
    }
    .doc-icon, .small-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    .privacy-note {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      color: var(--mat-sys-on-surface-variant);
      margin: 0;
    }
  `],
})
export class ApiKeyComponent {
  private readonly settings = inject(LocalSettingsAdapter);
  private readonly snackBar = inject(MatSnackBar);

  protected apiKeyInput = '';
  protected showKey = false;
  protected hasKey = signal(this.settings.hasApiKey());
  protected testStatus = signal<ApiKeyStatus>('idle');

  protected onTest(): void {
    if (!this.apiKeyInput) return;
    // L'API Anthropic ne supporte pas les appels CORS depuis un navigateur —
    // on valide uniquement le format de la clé.
    const valid = /^sk-ant-[a-zA-Z0-9_-]{20,}$/.test(this.apiKeyInput.trim());
    this.testStatus.set(valid ? 'valid' : 'invalid');
  }

  protected onSave(): void {
    if (!this.apiKeyInput) return;
    this.settings.setApiKey(this.apiKeyInput);
    this.hasKey.set(true);
    this.apiKeyInput = '';
    this.testStatus.set('idle');
    this.snackBar.open('Clé API enregistrée', 'OK', { duration: 2000 });
  }

  protected onRemove(): void {
    this.settings.clearApiKey();
    this.hasKey.set(false);
    this.testStatus.set('idle');
    this.snackBar.open('Clé API supprimée', 'OK', { duration: 2000 });
  }
}
