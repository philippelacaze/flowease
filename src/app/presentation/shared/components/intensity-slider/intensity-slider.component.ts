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
  template: `
    <div class="intensity-slider">
      <label class="intensity-label" [id]="labelId">
        {{ label }}
        <span class="intensity-value" aria-live="polite">{{ value }}/10</span>
      </label>
      <mat-slider
        [min]="1"
        [max]="10"
        [step]="1"
        [attr.aria-labelledby]="labelId"
        [attr.aria-valuemin]="1"
        [attr.aria-valuemax]="10"
        [attr.aria-valuenow]="value"
        [attr.aria-valuetext]="value + ' sur 10'"
        class="full-width"
      >
        <input
          matSliderThumb
          [value]="value"
          (valueChange)="onValueChange($event)"
        />
      </mat-slider>
    </div>
  `,
  styles: [`
    .intensity-slider { display: flex; flex-direction: column; gap: 4px; }
    .intensity-label {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      color: var(--mat-sys-on-surface-variant);
    }
    .intensity-value { font-weight: 600; color: var(--mat-sys-primary); }
    .full-width { width: 100%; }
  `],
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
