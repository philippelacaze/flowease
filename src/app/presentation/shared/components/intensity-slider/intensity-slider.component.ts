import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

/**
 * Slider d'intensité réutilisable (0–10) avec retour haptique.
 *
 * @remarks
 * Utilisé dans SymptomEntryComponent pour chaque symptôme saisi.
 * Implémenté via input[type="range"] natif (pas MatSlider) avec accent-color dynamique.
 * La valeur 0 signifie "absent". Principe SRP : ce composant ne connaît pas le contexte
 * métier, il délègue la signification de la valeur au parent.
 *
 * @param label - Label affiché au-dessus du slider
 * @param value - Valeur courante (0–10, 0 = absent)
 * @returns valueChange - Nouvelle valeur après interaction
 */
@Component({
  selector: 'app-intensity-slider',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './intensity-slider.component.html',
  styleUrl: './intensity-slider.component.scss',
})
export class IntensitySliderComponent {
  /** Label affiché au-dessus du slider. */
  @Input() label = '';

  /** Valeur courante (0–10, 0 = absent). */
  @Input() value = 0;

  /** Émis lors du changement de valeur. */
  @Output() valueChange = new EventEmitter<number>();

  protected get scoreColor(): string {
    if (this.value === 0) return 'var(--chip-border)';
    if (this.value <= 3)  return 'var(--fodmap-low-dot)';
    if (this.value <= 6)  return 'var(--fodmap-medium-dot)';
    return 'var(--fodmap-high-dot)';
  }

  protected onInput(event: Event): void {
    const val = +(event.target as HTMLInputElement).value;
    this.value = val;
    this.valueChange.emit(val);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }
}
