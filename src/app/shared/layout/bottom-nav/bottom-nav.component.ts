import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  readonly path: string;
  readonly emoji: string;
  readonly label: string;
}

/**
 * Barre de navigation inférieure — visible uniquement sur mobile.
 *
 * @remarks
 * Respecte la règle "chemin le plus court = 1 tap" — accès direct aux 5 modules.
 * Affiché par ShellComponent quand la largeur < 768px.
 * Zones tappables min 56px (dépassent les 44px requis).
 */
@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.scss',
})
export class BottomNavComponent {
  protected readonly navItems: readonly NavItem[] = [
    { path: '/journal',  emoji: '📓', label: 'Journal'    },
    { path: '/analysis', emoji: '📊', label: 'Analyse'    },
    { path: '/report',   emoji: '📄', label: 'Rapport'    },
    { path: '/coach',    emoji: '💬', label: 'Coach'      },
    { path: '/settings', emoji: '⚙️', label: 'Paramètres' },
  ];
}
