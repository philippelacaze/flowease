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
  templateUrl: './settings-home.component.html',
  styleUrl: './settings-home.component.scss',
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
