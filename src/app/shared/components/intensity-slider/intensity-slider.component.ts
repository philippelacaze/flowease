import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

/**
 * Slider d'intensité réutilisable (0–10) avec retour haptique.
 *
 * @remarks
 * Utilisé dans SymptomEntryComponent pour chaque symptôme saisi.
 * Implémenté via input[type="range"] natif (pas MatSlider) avec accent-color dynamique.
 * La valeur 0 signifie "absent". Principe SRP : ce composant ne connaît pas le contexte
 * métier, il délègue la signification de la valeur au parent.
 * inverted=true inverse l'échelle de couleur et les libellés (ex: bien-être, humeur).
 *
 * @param label - Label affiché au-dessus du slider
 * @param value - Valeur courante (0–10, 0 = absent)
 * @param inverted - Inverse l'échelle : bas = mauvais (rouge), haut = bon (vert)
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

  /** Inverse l'échelle de couleur et les libellés (bien-être, humeur, énergie). */
  @Input() inverted = false;

  /** Émis lors du changement de valeur. */
  @Output() valueChange = new EventEmitter<number>();

  protected get scoreColor(): string {
    // Échelle de couleur : 0 absent (gris), 1 vert, 2–3 jaune, 4–6 orange, 7–10 rouge.
    // En mode inversé (haut = bon), l'échelle est miroir : 1–3 rouge, 4–6 orange, 7–8 jaune, 9–10 vert.
    if (this.value === 0) return 'var(--chip-border)';
    if (this.inverted) {
      if (this.value <= 3) return 'var(--fodmap-high-dot)';
      if (this.value <= 6) return 'var(--fodmap-medium-dot)';
      if (this.value <= 8) return 'var(--yellow)';
      return 'var(--fodmap-low-dot)';
    }
    if (this.value <= 1)  return 'var(--fodmap-low-dot)';
    if (this.value <= 3)  return 'var(--yellow)';
    if (this.value <= 6)  return 'var(--fodmap-medium-dot)';
    return 'var(--fodmap-high-dot)';
  }

  protected get legendMinColor(): string {
    return this.inverted ? 'var(--fodmap-high-dot)' : 'var(--fodmap-low-dot)';
  }

  protected get legendMaxColor(): string {
    return this.inverted ? 'var(--fodmap-low-dot)' : 'var(--fodmap-high-dot)';
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
