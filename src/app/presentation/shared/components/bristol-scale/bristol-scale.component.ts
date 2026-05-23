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
  template: `
    <div class="bristol-scale" role="radiogroup" aria-label="Échelle de Bristol — type de selle">
      @for (item of descriptions; track item.type) {
        <button
          class="bristol-item"
          role="radio"
          [attr.aria-checked]="value === item.type"
          [attr.aria-label]="'Type ' + item.type + ' — ' + item.labelFr"
          [class.bristol-item--selected]="value === item.type"
          (click)="select(item.type)"
        >
          <svg viewBox="0 0 32 32" class="bristol-icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            @switch (item.type) {
              @case (1) {
                <circle cx="8"  cy="16" r="5" fill="#8B4513"/>
                <circle cx="20" cy="10" r="4" fill="#8B4513"/>
                <circle cx="24" cy="22" r="4" fill="#8B4513"/>
              }
              @case (2) {
                <path d="M6 12 Q16 8 26 12 Q28 18 26 22 Q16 26 6 22 Q4 18 6 12Z" fill="#A0522D"/>
                <path d="M9 14 Q16 12 23 14" stroke="#6B3410" stroke-width="1.5" fill="none"/>
              }
              @case (3) {
                <path d="M6 12 Q16 8 26 12 Q28 18 26 22 Q16 26 6 22 Q4 18 6 12Z" fill="#CD853F"/>
                <path d="M8 15 Q12 14 14 16" stroke="#8B4513" stroke-width="1" fill="none"/>
                <path d="M18 14 Q22 13 24 15" stroke="#8B4513" stroke-width="1" fill="none"/>
              }
              @case (4) {
                <path d="M6 12 Q16 8 26 12 Q28 18 26 22 Q16 26 6 22 Q4 18 6 12Z" fill="#DEB887"/>
              }
              @case (5) {
                <ellipse cx="9"  cy="18" rx="6" ry="5" fill="#D2B48C"/>
                <ellipse cx="20" cy="14" rx="5" ry="4" fill="#D2B48C"/>
                <ellipse cx="25" cy="22" rx="4" ry="4" fill="#D2B48C"/>
              }
              @case (6) {
                <path d="M6 16 Q10 10 14 16 Q18 22 22 16 Q26 10 28 16" stroke="#C19A6B" stroke-width="6" stroke-linecap="round" fill="none"/>
              }
              @case (7) {
                <path d="M4 18 Q10 12 16 18 Q22 24 28 18" stroke="#B8860B" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.7"/>
              }
            }
          </svg>
          <span class="bristol-type-num">{{ item.type }}</span>
          <span class="bristol-desc">{{ item.labelFr }}</span>
        </button>
      }
    </div>
  `,
  styles: [`
    .bristol-scale {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }
    @media (max-width: 360px) {
      .bristol-scale { grid-template-columns: repeat(3, 1fr); }
    }
    .bristol-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      min-height: 80px;
      min-width: 44px;
      padding: 8px 4px;
      border: 1.5px solid var(--mat-sys-outline-variant);
      border-radius: 10px;
      background: transparent;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }
    .bristol-item--selected {
      background: var(--mat-sys-primary-container);
      border-color: var(--mat-sys-primary);
    }
    .bristol-icon { width: 32px; height: 32px; }
    .bristol-type-num {
      font-weight: 700;
      font-size: 13px;
      color: var(--mat-sys-primary);
    }
    .bristol-desc {
      font-size: 9px;
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
      line-height: 1.2;
    }
  `],
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
