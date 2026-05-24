import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';

/**
 * Slider d'intensité réutilisable (1–10) avec retour haptique.
 *
 * @remarks
 * Utilisé dans SymptomEntryComponent pour chaque symptôme saisi.
 * Principe SRP : ce composant ne connaît pas le contexte métier,
 * il délègue la signification de la valeur au parent.
 * Le retour haptique via navigator.vibrate est conditionnel (API optionnelle).
 */
@Component({
  selector: 'app-intensity-slider',
  standalone: true,
  imports: [MatSliderModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './intensity-slider.component.html',
  styleUrl: './intensity-slider.component.scss',
})
export class IntensitySliderComponent {
  /** Label affiché au-dessus du slider. */
  @Input() label = '';

  /** Valeur courante (1–10). */
  @Input() value = 5;

  /** Émis lors du changement de valeur. */
  @Output() valueChange = new EventEmitter<number>();

  protected readonly labelId = `intensity-${Math.random().toString(36).slice(2, 9)}`;

  protected onValueChange(val: number): void {
    this.value = val;
    this.valueChange.emit(val);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }
}
