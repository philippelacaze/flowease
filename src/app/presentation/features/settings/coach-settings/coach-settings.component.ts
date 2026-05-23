import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { LocalSettingsAdapter } from '../../../../infrastructure/storage/local-settings.adapter';

interface CoachPreferences {
  mode: string;
  defaultContext: string;
  showTokenCounter: boolean;
  language: string;
}

/**
 * Page de préférences du Coach IA.
 *
 * @remarks
 * Respecte SRP — persiste les préférences Coach via LocalSettingsAdapter.
 * Le mode Coach contrôle le niveau de détail des réponses de l'IA.
 */
@Component({
  selector: 'app-coach-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatDividerModule,
  ],
  template: `
    <div class="coach-settings-page">
      <header class="page-header">
        <a mat-icon-button routerLink=".." aria-label="Retour aux paramètres">
          <mat-icon>arrow_back</mat-icon>
        </a>
        <h1>Préférences Coach</h1>
      </header>

      <div class="settings-content">

        <!-- Mode Coach -->
        <section class="setting-section">
          <h2 class="section-title">Mode de réponse</h2>
          <p class="section-desc">Détermine le niveau de détail des réponses du Coach IA.</p>
          <mat-button-toggle-group
            [(ngModel)]="prefs.mode"
            aria-label="Mode de réponse du Coach"
            class="mode-toggle">
            <mat-button-toggle value="concise" data-testid="mode-concise">
              Concis
            </mat-button-toggle>
            <mat-button-toggle value="standard" data-testid="mode-standard">
              Standard
            </mat-button-toggle>
            <mat-button-toggle value="detailed" data-testid="mode-detailed">
              Détaillé
            </mat-button-toggle>
          </mat-button-toggle-group>
        </section>

        <mat-divider />

        <!-- Contexte par défaut -->
        <section class="setting-section">
          <h2 class="section-title">Fenêtre de contexte par défaut</h2>
          <p class="section-desc">Données chargées automatiquement au démarrage d'une session Coach.</p>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Fenêtre de contexte</mat-label>
            <mat-select [(ngModel)]="prefs.defaultContext" aria-label="Fenêtre de contexte par défaut" data-testid="context-select">
              <mat-option value="today">Aujourd'hui uniquement</mat-option>
              <mat-option value="7">7 derniers jours</mat-option>
              <mat-option value="14">14 derniers jours (recommandé)</mat-option>
              <mat-option value="30">30 derniers jours</mat-option>
              <mat-option value="profile">Profil uniquement (moins de tokens)</mat-option>
            </mat-select>
          </mat-form-field>
        </section>

        <mat-divider />

        <!-- Compteur de tokens -->
        <section class="setting-section">
          <h2 class="section-title">Affichage des tokens</h2>
          <mat-slide-toggle
            [(ngModel)]="prefs.showTokenCounter"
            aria-label="Afficher le compteur de tokens dans l'interface Coach"
            data-testid="token-counter-toggle">
            Afficher le compteur de tokens
          </mat-slide-toggle>
          <p class="section-desc">Affiche une estimation du nombre de tokens consommés par session.</p>
        </section>

        <mat-divider />

        <!-- Langue du Coach -->
        <section class="setting-section">
          <h2 class="section-title">Langue du Coach</h2>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Langue des réponses</mat-label>
            <mat-select [(ngModel)]="prefs.language" aria-label="Langue du Coach" data-testid="language-select">
              <mat-option value="fr">Français</mat-option>
              <mat-option value="en">English</mat-option>
            </mat-select>
          </mat-form-field>
        </section>

        <div class="save-actions">
          <button
            mat-raised-button
            color="primary"
            (click)="onSave()"
            aria-label="Enregistrer les préférences du Coach"
            data-testid="save-coach-btn"
            class="save-btn">
            <mat-icon>save</mat-icon>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .coach-settings-page {
      max-width: 640px;
      margin: 0 auto;
      padding: 16px;
    }
    .page-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    .page-header h1 {
      font-size: 1.4rem;
      margin: 0;
    }
    .settings-content {
      display: flex;
      flex-direction: column;
    }
    .setting-section {
      padding: 16px 0;
    }
    .section-title {
      font-size: 1rem;
      font-weight: 500;
      margin: 0 0 4px;
    }
    .section-desc {
      font-size: 0.85rem;
      color: var(--mat-sys-on-surface-variant);
      margin: 0 0 12px;
    }
    .mode-toggle {
      flex-wrap: wrap;
    }
    .full-width {
      width: 100%;
    }
    .save-actions {
      padding: 16px 0;
      display: flex;
      justify-content: flex-end;
    }
    .save-btn {
      min-height: 44px;
      min-width: 140px;
    }
  `],
})
export class CoachSettingsComponent implements OnInit {
  private readonly settings = inject(LocalSettingsAdapter);
  private readonly snackBar = inject(MatSnackBar);

  protected prefs: CoachPreferences = {
    mode: 'standard',
    defaultContext: '14',
    showTokenCounter: false,
    language: 'fr',
  };

  ngOnInit(): void {
    this.prefs = {
      mode: this.settings.getCoachMode(),
      defaultContext: String(this.settings.getDefaultWindow()),
      showTokenCounter: this.settings.getShowTokenCounter(),
      language: this.settings.getLanguage(),
    };
  }

  protected onSave(): void {
    this.settings.setCoachMode(this.prefs.mode);
    this.settings.setDefaultWindow(Number(this.prefs.defaultContext) || 14);
    this.settings.setShowTokenCounter(this.prefs.showTokenCounter);
    this.settings.setLanguage(this.prefs.language);
    this.snackBar.open('Préférences enregistrées', 'OK', { duration: 2000 });
  }
}
