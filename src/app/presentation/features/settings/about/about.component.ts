import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';

/**
 * Page d'information sur l'application FlowEase.
 *
 * @remarks
 * Composant statique — aucune injection. Affiche version, liens et
 * mentions légales. Le numéro de version est défini à la compilation.
 */
@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatDividerModule, MatListModule],
  template: `
    <div class="about-page">
      <header class="page-header">
        <a mat-icon-button routerLink=".." aria-label="Retour aux paramètres">
          <mat-icon>arrow_back</mat-icon>
        </a>
        <h1>À propos</h1>
      </header>

      <div class="app-identity">
        <div class="app-logo" aria-hidden="true">
          <mat-icon class="logo-icon">favorite</mat-icon>
        </div>
        <h2 class="app-name">FlowEase</h2>
        <p class="app-version" data-testid="app-version">Version {{ version }}</p>
        <p class="app-tagline">
          Journal de suivi SIBO &amp; gastroparésie
        </p>
      </div>

      <mat-divider />

      <mat-list>
        <a
          mat-list-item
          href="https://github.com/flowease-app/flowease"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Voir le code source sur GitHub (nouvel onglet)"
          data-testid="github-link">
          <mat-icon matListItemIcon>code</mat-icon>
          <span matListItemTitle>Code source</span>
          <span matListItemLine>github.com/flowease-app/flowease</span>
          <mat-icon matListItemMeta>open_in_new</mat-icon>
        </a>

        <a
          mat-list-item
          href="https://console.anthropic.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Documentation Claude par Anthropic (nouvel onglet)"
          data-testid="anthropic-link">
          <mat-icon matListItemIcon>smart_toy</mat-icon>
          <span matListItemTitle>Propulsé par Claude (Anthropic)</span>
          <span matListItemLine>console.anthropic.com</span>
          <mat-icon matListItemMeta>open_in_new</mat-icon>
        </a>
      </mat-list>

      <mat-divider />

      <section class="legal-section" aria-label="Mentions légales">
        <h3 class="legal-title">Mentions légales</h3>

        <p class="legal-text">
          FlowEase est une application personnelle de suivi de santé.
          Elle ne remplace pas l'avis d'un professionnel de santé.
          Consultez toujours votre médecin ou gastro-entérologue pour
          tout suivi médical.
        </p>

        <p class="legal-text">
          <strong>Données personnelles :</strong> Toutes vos données de santé
          sont stockées uniquement sur votre appareil (IndexedDB). Aucune
          donnée n'est transmise à nos serveurs. Seules les fonctions IA
          transmettent des données anonymisées à l'API Anthropic, avec
          votre clé API personnelle.
        </p>

        <p class="legal-text">
          <strong>Clé API :</strong> Votre clé Anthropic est stockée dans
          le localStorage de votre navigateur et n'est jamais partagée.
        </p>
      </section>
    </div>
  `,
  styles: [`
    .about-page {
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
    .app-identity {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 24px 0;
      text-align: center;
    }
    .app-logo {
      width: 72px;
      height: 72px;
      border-radius: 20px;
      background: var(--mat-sys-primary-container);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: var(--mat-sys-on-primary-container);
    }
    .app-name {
      font-size: 1.6rem;
      font-weight: 700;
      margin: 0;
    }
    .app-version {
      font-size: 0.9rem;
      color: var(--mat-sys-on-surface-variant);
      margin: 0;
    }
    .app-tagline {
      font-size: 0.95rem;
      color: var(--mat-sys-on-surface-variant);
      margin: 4px 0 0;
    }
    .legal-section {
      padding: 16px 0;
    }
    .legal-title {
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 12px;
    }
    .legal-text {
      font-size: 0.85rem;
      color: var(--mat-sys-on-surface-variant);
      line-height: 1.5;
      margin-bottom: 12px;
    }
  `],
})
export class AboutComponent {
  protected readonly version = '1.0.0';
}
