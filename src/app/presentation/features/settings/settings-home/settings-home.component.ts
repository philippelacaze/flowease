import {
  Component,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LOCAL_SETTINGS_PORT } from '../../../../application/tokens';
import type { LocalSettingsRepository } from '../../../../domain/repositories/local-settings.repository';

interface SettingsItem {
  readonly label: string;
  readonly emoji: string;
  readonly route: string;
  readonly description: string;
}

/**
 * Menu de navigation des paramètres de l'application.
 *
 * @remarks
 * Respecte SRP — affichage de la liste de navigation uniquement.
 * Chaque section est chargée en lazy loading depuis settings.routes.ts.
 * Affiche un banner de statut de la clé API via hasApiKey().
 */
@Component({
  selector: 'app-settings-home',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings-home.component.html',
  styleUrl: './settings-home.component.scss',
})
export class SettingsHomeComponent {
  private readonly settings = inject<LocalSettingsRepository>(LOCAL_SETTINGS_PORT as never);

  protected readonly apiKeyConfigured = this.settings.hasApiKey();

  protected readonly items: readonly SettingsItem[] = [
    { label: 'Mon profil',                 emoji: '👤',  route: 'profile',         description: 'Conditions médicales, protocole' },
    { label: 'Clé API Claude',             emoji: '🔑',  route: 'api-key',         description: 'Accès aux fonctions IA' },
    { label: 'Traitements',                emoji: '💊',  route: 'treatments',      description: 'Médicaments et rappels' },
    { label: 'Symptômes',                  emoji: '🫀',  route: 'symptoms-config', description: 'Personnaliser le suivi' },
    { label: 'Préférences Coach',          emoji: '🤖',  route: 'coach-settings',  description: 'Mode et contexte IA' },
    { label: 'Données & confidentialité',  emoji: '🛡️', route: 'data-privacy',    description: 'Export, import, suppression' },
    { label: 'À propos',                   emoji: 'ℹ️', route: 'about',           description: 'Version 1.0.0 · GitHub' },
  ];
}
