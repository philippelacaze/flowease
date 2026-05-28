import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { FoodItemVO } from '../../../../domain/entities/meal.entity';

/**
 * Chip représentant un aliment individuel avec coloration FODMAP.
 *
 * @remarks
 * Composant autonome utilisé dans MealEntryComponent (editable) et JournalHome
 * (removable=false). confirmed = false affiche un badge "IA".
 * Principe SRP : styles FODMAP portés par les classes CSS `food-chip--{level}`.
 *
 * @param item - L'aliment à représenter
 * @param editable - Si vrai, affiche les boutons confirmer/supprimer
 * @param removable - Si vrai, affiche uniquement le bouton supprimer
 */
@Component({
  selector: 'app-food-chip',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './food-chip.component.html',
  styleUrl: './food-chip.component.scss',
})
export class FoodChipComponent {
  /** L'aliment à afficher. */
  @Input({ required: true }) item!: FoodItemVO;

  /** Affiche les boutons confirmer/supprimer si vrai. */
  @Input() editable = false;

  /** Affiche le bouton supprimer sans le bouton confirmer. */
  @Input() removable = false;

  /** Émis quand l'utilisateur clique sur "Supprimer". */
  @Output() remove = new EventEmitter<void>();

  /** Émis quand l'utilisateur clique sur "Confirmer" (mode editable). */
  @Output() edit = new EventEmitter<FoodItemVO>();

  protected get chipAriaLabel(): string {
    const fodmap = this.item.fodmap?.level !== 'unknown'
      ? `, FODMAP ${this.item.fodmap?.level}`
      : '';
    const ai = !this.item.confirmed ? ', suggestion IA' : '';
    return `${this.item.name}${fodmap}${ai}`;
  }

  protected get levelClass(): string {
    return `food-chip--${this.item.fodmap?.level ?? 'unknown'}`;
  }
}
