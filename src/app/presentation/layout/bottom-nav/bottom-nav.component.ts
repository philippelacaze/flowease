import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';

interface NavItem {
  readonly path: string;
  readonly icon: string;
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
  imports: [RouterLink, RouterLinkActive, MatIconModule, MatRippleModule],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.scss',
})
export class BottomNavComponent {
  protected readonly navItems: readonly NavItem[] = [
    { path: '/journal',  icon: 'menu_book',   label: 'Journal'    },
    { path: '/analysis', icon: 'bar_chart',   label: 'Analyse'    },
    { path: '/report',   icon: 'description', label: 'Rapport'    },
    { path: '/coach',    icon: 'chat',        label: 'Coach'      },
    { path: '/settings', icon: 'settings',    label: 'Paramètres' },
  ];
}
