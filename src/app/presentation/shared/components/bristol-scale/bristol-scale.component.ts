import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { BristolType, BRISTOL_DESCRIPTIONS } from '../../../../domain/value-objects/bristol-type.vo';

/**
 * Sélecteur de l'échelle de Bristol (types 1–7).
 *
 * @remarks
 * Composant autonome utilisé dans SymptomEntryComponent pour consigner le transit.
 * Les icônes sont des formes géométriques SVG statiques rendues via @switch —
 * aucun innerHTML, aucune donnée utilisateur dans le SVG.
 * Principe SRP : la signification clinique est documentée dans BristolType, pas ici.
 *
 * @param value - Type Bristol sélectionné (null = non renseigné)
 * @returns valueChange - Type Bristol sélectionné par l'utilisateur
 */
@Component({
  selector: 'app-bristol-scale',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bristol-scale.component.html',
  styleUrl: './bristol-scale.component.scss',
})
export class BristolScaleComponent {
  /** Type Bristol sélectionné, ou null si non renseigné. */
  @Input() value: BristolType | null = null;

  /** Émis quand l'utilisateur sélectionne un type. */
  @Output() valueChange = new EventEmitter<BristolType>();

  protected readonly descriptions = BRISTOL_DESCRIPTIONS;

  protected select(type: BristolType): void {
    this.valueChange.emit(type);
  }
}
