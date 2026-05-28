import { Component, ChangeDetectionStrategy } from '@angular/core';

/**
 * Légende des niveaux FODMAP (Faible / Moyen / Élevé).
 *
 * @remarks
 * Composant autonome affiché dans MealEntryComponent (phase validation)
 * pour expliquer la signification des couleurs des chips alimentaires.
 * Respecte SRP : affichage de légende uniquement, sans logique métier.
 */
@Component({
  selector: 'app-fod-pill',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fod-pill.component.html',
  styleUrl: './fod-pill.component.scss',
})
export class FodPillComponent {
  protected readonly levels = [
    { key: 'low',    color: 'var(--fodmap-low-dot)',    label: 'Faible' },
    { key: 'medium', color: 'var(--fodmap-medium-dot)', label: 'Moyen'  },
    { key: 'high',   color: 'var(--fodmap-high-dot)',   label: 'Élevé'  },
  ] as const;
}
