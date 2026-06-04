import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import type { CureProgressVO } from '../services/intake.service';

/**
 * Affiche une barre de progression pour chaque cure active du jour.
 *
 * @remarks
 * Respecte SRP : rendu uniquement — aucune logique métier.
 * Reçoit les données pré-calculées par GetActiveCuresUseCase via le parent JournalHomeComponent.
 * Composant discret, intégré au-dessus de la liste des entrées du journal.
 */
@Component({
  selector: 'app-cure-progress',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cure-progress.component.html',
  styleUrl: './cure-progress.component.scss',
})
export class CureProgressComponent {
  /** Liste des cures actives avec progression calculée. */
  readonly cures = input<CureProgressVO[]>([]);
}
