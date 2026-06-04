import { Pipe, PipeTransform } from '@angular/core';
import type { FodmapLevel } from '../../core/models/value-objects/fodmap-level.vo';

/**
 * Convertit un FodmapLevel en classe CSS pour les chips alimentaires.
 *
 * @remarks
 * Pipe pur (stateless) — utilisé par FoodChipComponent pour colorer les chips
 * selon le niveau FODMAP de l'aliment.
 *
 * @param value - Le niveau FODMAP de l'aliment
 * @returns Classe CSS correspondante ('chip-low' | 'chip-medium' | 'chip-high' | 'chip-unknown')
 */
@Pipe({
  name: 'fodmapColor',
  standalone: true,
  pure: true,
})
export class FodmapColorPipe implements PipeTransform {
  transform(value: FodmapLevel | undefined | null): string {
    switch (value) {
      case 'low':     return 'chip-low';
      case 'medium':  return 'chip-medium';
      case 'high':    return 'chip-high';
      default:        return 'chip-unknown';
    }
  }
}
