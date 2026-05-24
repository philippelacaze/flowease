import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NgClass, NgFor } from '@angular/common';
import {
  AbdominalZone,
  ABDOMINAL_ZONES,
} from '../../../../domain/value-objects/pain-location.vo';

interface ZoneConfig {
  id: AbdominalZone;
  labelFr: string;
  labelEn: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Cartographie abdominale SVG interactive avec 6 zones tappables.
 *
 * @remarks
 * Composant autonome utilisé dans SymptomEntryComponent pour localiser les douleurs.
 * Chaque zone fait ≥ 44×44px (WCAG 2.5.5). Sélection multiple supportée.
 * Principe SRP : délègue l'interprétation médicale au use case AddSymptomUseCase.
 *
 * @param selectedZones - Zones actuellement sélectionnées
 * @returns zonesChange - Tableau mis à jour des zones sélectionnées
 */
@Component({
  selector: 'app-abdominal-map',
  standalone: true,
  imports: [NgClass, NgFor],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './abdominal-map.component.html',
  styleUrl: './abdominal-map.component.scss',
})
export class AbdominalMapComponent {
  /** Zones actuellement sélectionnées. */
  @Input() selectedZones: ReadonlyArray<AbdominalZone> = [];

  /** Émis avec le nouveau tableau de zones à chaque sélection/désélection. */
  @Output() zonesChange = new EventEmitter<AbdominalZone[]>();

  protected readonly zones: ZoneConfig[] = [
    { ...ABDOMINAL_ZONES[2], x: 110, y: 30,  width: 60, height: 55 },  // hypochondre_right
    { ...ABDOMINAL_ZONES[1], x: 30,  y: 30,  width: 60, height: 55 },  // hypochondre_left
    { ...ABDOMINAL_ZONES[0], x: 65,  y: 30,  width: 70, height: 55 },  // epigastric
    { ...ABDOMINAL_ZONES[3], x: 65,  y: 110, width: 70, height: 55 },  // periumbilical
    { ...ABDOMINAL_ZONES[5], x: 110, y: 190, width: 60, height: 55 },  // iliac_right
    { ...ABDOMINAL_ZONES[4], x: 30,  y: 190, width: 60, height: 55 },  // iliac_left
  ];

  protected isSelected(zone: AbdominalZone): boolean {
    return this.selectedZones.includes(zone);
  }

  protected toggleZone(zone: AbdominalZone): void {
    const current = [...this.selectedZones];
    const idx = current.indexOf(zone);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(zone);
    }
    this.zonesChange.emit(current);
  }
}
