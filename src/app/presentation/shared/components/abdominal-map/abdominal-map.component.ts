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
  template: `
    <div class="abdominal-map-container" role="group" aria-label="Cartographie des douleurs abdominales">
      <svg
        viewBox="0 0 200 280"
        xmlns="http://www.w3.org/2000/svg"
        class="abdominal-svg"
        aria-hidden="true"
      >
        <!-- Silhouette abdominale -->
        <ellipse cx="100" cy="140" rx="80" ry="120" fill="var(--mat-sys-surface-variant)" stroke="var(--mat-sys-outline)" stroke-width="1.5"/>

        <!-- Zones cliquables -->
        <rect *ngFor="let zone of zones"
          [attr.x]="zone.x"
          [attr.y]="zone.y"
          [attr.width]="zone.width"
          [attr.height]="zone.height"
          rx="8"
          [ngClass]="isSelected(zone.id) ? 'zone-selected' : 'zone-idle'"
          (click)="toggleZone(zone.id)"
          style="cursor:pointer"
        />

        <!-- Labels centrés dans chaque zone -->
        <text *ngFor="let zone of zones"
          [attr.x]="zone.x + zone.width / 2"
          [attr.y]="zone.y + zone.height / 2 + 4"
          text-anchor="middle"
          font-size="9"
          class="zone-label"
          pointer-events="none"
        >{{ zone.labelFr }}</text>
      </svg>

      <!-- Boutons accessibles en overlay (≥ 44px) -->
      <div class="zone-buttons" role="group">
        <button
          *ngFor="let zone of zones"
          class="zone-btn"
          [class.zone-btn--selected]="isSelected(zone.id)"
          [attr.aria-label]="zone.labelFr + (isSelected(zone.id) ? ' — sélectionnée' : '')"
          [attr.aria-pressed]="isSelected(zone.id)"
          (click)="toggleZone(zone.id)"
        >{{ zone.labelFr }}</button>
      </div>
    </div>
  `,
  styles: [`
    .abdominal-map-container { display: flex; flex-direction: column; gap: 12px; align-items: center; }
    .abdominal-svg { width: 160px; height: 224px; }
    .zone-idle   { fill: transparent; stroke: var(--mat-sys-outline-variant); stroke-width: 1; }
    .zone-selected { fill: var(--mat-sys-primary-container); stroke: var(--mat-sys-primary); stroke-width: 2; }
    .zone-label  { fill: var(--mat-sys-on-surface-variant); font-family: inherit; }
    .zone-buttons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      width: 100%;
    }
    .zone-btn {
      min-height: 44px;
      padding: 0 12px;
      border: 1.5px solid var(--mat-sys-outline-variant);
      border-radius: 8px;
      background: transparent;
      cursor: pointer;
      font-size: 13px;
      transition: background 0.15s;
    }
    .zone-btn--selected {
      background: var(--mat-sys-primary-container);
      border-color: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary-container);
    }
  `],
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
