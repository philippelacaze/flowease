import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { FoodItemVO } from '../../../../domain/entities/meal.entity';
import { FodmapColorPipe } from '../../pipes/fodmap-color.pipe';

/**
 * Chip représentant un aliment individuel avec coloration FODMAP.
 *
 * @remarks
 * Composant autonome utilisé dans MealEntryComponent pour afficher et éditer
 * les aliments d'un repas. confirmed = false affiche un badge "IA" pour signaler
 * une suggestion non encore validée par l'utilisateur.
 * Principe SRP : la logique FODMAP reste dans FodmapColorPipe.
 *
 * @param item - L'aliment à représenter
 * @param editable - Si vrai, affiche les boutons éditer/supprimer
 */
@Component({
  selector: 'app-food-chip',
  standalone: true,
  imports: [NgClass, NgIf, MatIconModule, MatChipsModule, FodmapColorPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="food-chip"
      [ngClass]="item.fodmap.level | fodmapColor"
      role="listitem"
    >
      <span class="food-chip__name" [attr.aria-label]="chipAriaLabel">
        {{ item.name }}
        <span *ngIf="item.quantity" class="food-chip__qty"> {{ item.quantity }}{{ item.unit }}</span>
      </span>

      <span
        *ngIf="!item.confirmed"
        class="food-chip__ai-badge"
        aria-label="Suggestion IA non validée"
        title="Suggestion IA — appuyez pour valider"
      >IA</span>

      <ng-container *ngIf="editable">
        <button
          class="food-chip__btn"
          [attr.aria-label]="'Modifier ' + item.name"
          (click)="edit.emit(item)"
        >
          <mat-icon aria-hidden="true">edit</mat-icon>
        </button>
        <button
          class="food-chip__btn food-chip__btn--remove"
          [attr.aria-label]="'Supprimer ' + item.name"
          (click)="remove.emit()"
        >
          <mat-icon aria-hidden="true">close</mat-icon>
        </button>
      </ng-container>
    </div>
  `,
  styles: [`
    :host { display: inline-block; }
    .food-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      border-radius: 20px;
      font-size: 13px;
      line-height: 1;
      border: 1px solid transparent;
    }
    .chip-low     { background: #e8f5e9; border-color: #81c784; color: #2e7d32; }
    .chip-medium  { background: #fff8e1; border-color: #ffd54f; color: #f57f17; }
    .chip-high    { background: #ffebee; border-color: #e57373; color: #c62828; }
    .chip-unknown { background: var(--mat-sys-surface-variant); color: var(--mat-sys-on-surface-variant); }

    .food-chip__name { font-weight: 500; }
    .food-chip__qty  { font-weight: 400; font-size: 11px; }

    .food-chip__ai-badge {
      font-size: 9px;
      font-weight: 700;
      background: var(--mat-sys-tertiary);
      color: var(--mat-sys-on-tertiary);
      border-radius: 4px;
      padding: 1px 4px;
    }

    .food-chip__btn {
      display: flex;
      align-items: center;
      min-width: 24px;
      min-height: 24px;
      padding: 0;
      border: none;
      background: transparent;
      cursor: pointer;
      color: inherit;
      opacity: 0.7;
    }
    .food-chip__btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .food-chip__btn--remove:hover { opacity: 1; color: var(--mat-sys-error); }
  `],
})
export class FoodChipComponent {
  /** L'aliment à afficher. */
  @Input({ required: true }) item!: FoodItemVO;

  /** Affiche les boutons éditer/supprimer si vrai. */
  @Input() editable = false;

  /** Émis quand l'utilisateur clique sur "Supprimer". */
  @Output() remove = new EventEmitter<void>();

  /** Émis quand l'utilisateur clique sur "Modifier". */
  @Output() edit = new EventEmitter<FoodItemVO>();

  protected get chipAriaLabel(): string {
    const fodmap = this.item.fodmap.level !== 'unknown'
      ? `, FODMAP ${this.item.fodmap.level}`
      : '';
    const ai = !this.item.confirmed ? ', suggestion IA' : '';
    return `${this.item.name}${fodmap}${ai}`;
  }
}
