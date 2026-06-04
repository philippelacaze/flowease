import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { LocalSettingsService } from '../../../core/services/local-settings.service';

interface NavItem {
  readonly path: string;
  readonly icon: string;
  readonly label: string;
}

/**
 * Panneau de navigation latéral permanent — visible uniquement sur desktop.
 *
 * @remarks
 * Respecte SRP : ne gère que la navigation et l'affichage du statut apiKey.
 * Affiché par ShellComponent dans un MatSidenav quand la largeur ≥ 768px.
 * Injecte LOCAL_SETTINGS_PORT (abstraction domain) — jamais LocalSettingsService directement.
 */
@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule, MatListModule],
  templateUrl: './side-nav.component.html',
  styleUrl: './side-nav.component.scss',
})
export class SideNavComponent {
  private readonly settings = inject(LocalSettingsService);

  protected readonly navItems: readonly NavItem[] = [
    { path: '/journal',  icon: 'menu_book',   label: 'Journal'    },
    { path: '/analysis', icon: 'bar_chart',   label: 'Analyse'    },
    { path: '/report',   icon: 'description', label: 'Rapport'    },
    { path: '/coach',    icon: 'chat',        label: 'Coach'      },
    { path: '/settings', icon: 'settings',    label: 'Paramètres' },
  ];

  /**
   * Indique si une clé API Anthropic est configurée.
   * Évalué à chaque cycle de détection de changements.
   */
  protected get hasApiKey(): boolean {
    return this.settings.hasApiKey();
  }
}