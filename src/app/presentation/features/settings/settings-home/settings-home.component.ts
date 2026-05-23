import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';

interface SettingsItem {
  readonly label: string;
  readonly icon: string;
  readonly route: string;
  readonly description: string;
}

/**
 * Menu de navigation des paramètres de l'application.
 *
 * @remarks
 * Respecte SRP — affichage de la liste de navigation uniquement.
 * Chaque section est chargée en lazy loading depuis settings.routes.ts.
 */
@Component({
  selector: 'app-settings-home',
  standalone: true,
  imports: [RouterLink, MatListModule, MatIconModule],
  template: `
    <div class="settings-home">
      <header class="page-header">
        <h1>Paramètres</h1>
      </header>

      <mat-nav-list>
        @for (item of items; track item.route) {
          <a
            mat-list-item
            [routerLink]="item.route"
            [attr.aria-label]="item.label"
            [attr.data-testid]="'settings-' + item.route"
            class="settings-item">
            <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
            <span matListItemTitle>{{ item.label }}</span>
            <span matListItemLine>{{ item.description }}</span>
            <mat-icon matListItemMeta>chevron_right</mat-icon>
          </a>
        }
      </mat-nav-list>
    </div>
  `,
  styles: [`
    .settings-home {
      max-width: 640px;
      margin: 0 auto;
    }
    .page-header {
      padding: 16px 16px 8px;
    }
    .page-header h1 {
      font-size: 1.5rem;
      margin: 0;
    }
    .settings-item {
      min-height: 64px;
    }
  `],
})
export class SettingsHomeComponent {
  protected readonly items: SettingsItem[] = [
    {
      label: 'Mon profil',
      icon: 'person',
      route: 'profile',
      description: 'Conditions médicales, protocole alimentaire',
    },
    {
      label: 'Clé API Claude',
      icon: 'key',
      route: 'api-key',
      description: 'Configurer l\'accès à Claude pour les fonctions IA',
    },
    {
      label: 'Traitements',
      icon: 'medication',
      route: 'treatments',
      description: 'Gérer vos médicaments et rappels',
    },
    {
      label: 'Symptômes',
      icon: 'sick',
      route: 'symptoms-config',
      description: 'Personnaliser les symptômes suivis',
    },
    {
      label: 'Préférences Coach',
      icon: 'smart_toy',
      route: 'coach-settings',
      description: 'Mode, contexte et affichage du Coach IA',
    },
    {
      label: 'Données & confidentialité',
      icon: 'shield',
      route: 'data-privacy',
      description: 'Export, import et suppression des données',
    },
    {
      label: 'À propos',
      icon: 'info',
      route: 'about',
      description: 'Version, GitHub et mentions légales',
    },
  ];
}
