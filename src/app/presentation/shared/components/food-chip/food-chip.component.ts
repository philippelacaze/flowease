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
  templateUrl: './food-chip.component.html',
  styleUrl: './food-chip.component.scss',
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
