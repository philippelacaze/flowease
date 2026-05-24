import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AddSymptomUseCase } from '../../../../application/journal/add-symptom.usecase';
import { IntensitySliderComponent } from '../../../shared/components/intensity-slider/intensity-slider.component';
import { AbdominalMapComponent } from '../../../shared/components/abdominal-map/abdominal-map.component';
import { BristolScaleComponent } from '../../../shared/components/bristol-scale/bristol-scale.component';
import type { SymptomCategory } from '../../../../domain/entities/symptom.entity';
import type { AbdominalZone } from '../../../../domain/value-objects/pain-location.vo';
import type { PainType } from '../../../../domain/value-objects/pain-type.vo';
import type { BristolType } from '../../../../domain/value-objects/bristol-type.vo';
import { PAIN_TYPES } from '../../../../domain/value-objects/pain-type.vo';

interface SymptomRow {
  readonly category: SymptomCategory;
  readonly key: string;
  readonly labelFr: string;
  readonly hasMap: boolean;
  readonly hasPainTypes: boolean;
  readonly hasBristol: boolean;
  intensity: number;
  painZones: AbdominalZone[];
  painTypes: PainType[];
  bristolType: BristolType | null;
}

const SYMPTOM_DEFINITIONS: ReadonlyArray<
  Pick<SymptomRow, 'category' | 'key' | 'labelFr' | 'hasMap' | 'hasPainTypes' | 'hasBristol'>
> = [
  { category: 'digestive', key: 'abdominal_pain',  labelFr: 'Douleur abdominale', hasMap: true,  hasPainTypes: true,  hasBristol: false },
  { category: 'digestive', key: 'bloating',         labelFr: 'Ballonnements',      hasMap: false, hasPainTypes: false, hasBristol: false },
  { category: 'digestive', key: 'nausea',           labelFr: 'Nausées',            hasMap: false, hasPainTypes: false, hasBristol: false },
  { category: 'digestive', key: 'heartburn',        labelFr: 'Brûlures d\'estomac',hasMap: false, hasPainTypes: false, hasBristol: false },
  { category: 'digestive', key: 'transit',          labelFr: 'Transit',            hasMap: false, hasPainTypes: false, hasBristol: true  },
  { category: 'digestive', key: 'gas',              labelFr: 'Gaz / Flatulences',  hasMap: false, hasPainTypes: false, hasBristol: false },
  { category: 'systemic',  key: 'fatigue',          labelFr: 'Fatigue',            hasMap: false, hasPainTypes: false, hasBristol: false },
  { category: 'systemic',  key: 'headache',         labelFr: 'Maux de tête',       hasMap: false, hasPainTypes: false, hasBristol: false },
  { category: 'systemic',  key: 'brain_fog',        labelFr: 'Brouillard mental',  hasMap: false, hasPainTypes: false, hasBristol: false },
  { category: 'systemic',  key: 'joint_pain',       labelFr: 'Douleurs articulaires', hasMap: false, hasPainTypes: false, hasBristol: false },
  { category: 'wellbeing', key: 'energy',           labelFr: 'Énergie globale',    hasMap: false, hasPainTypes: false, hasBristol: false },
  { category: 'wellbeing', key: 'sleep_quality',    labelFr: 'Qualité du sommeil', hasMap: false, hasPainTypes: false, hasBristol: false },
  { category: 'wellbeing', key: 'mood',             labelFr: 'Humeur',             hasMap: false, hasPainTypes: false, hasBristol: false },
  { category: 'wellbeing', key: 'stress',           labelFr: 'Stress',             hasMap: false, hasPainTypes: false, hasBristol: false },
];

/**
 * Page de saisie des symptômes — 3 blocs : Digestifs, Systémiques, Bien-être.
 *
 * @remarks
 * Importe uniquement AddSymptomUseCase depuis la couche application.
 * Chaque symptôme avec intensity > 0 génère un appel execute() distinct.
 * Les entrées transit sans intensity > 0 mais avec bristolType défini sont aussi sauvegardées.
 */
@Component({
  selector: 'app-symptom-entry',
  standalone: true,
  imports: [
    NgFor, NgIf,
    MatButtonModule, MatIconModule,
    IntensitySliderComponent, AbdominalMapComponent, BristolScaleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './symptom-entry.component.html',
  styleUrl: './symptom-entry.component.scss',
})
export class SymptomEntryComponent {
  private readonly addSymptom = inject(AddSymptomUseCase);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly painTypes = PAIN_TYPES;
  protected saving = false;

  protected readonly rows: SymptomRow[] = SYMPTOM_DEFINITIONS.map(def => ({
    ...def,
    intensity: 0,
    painZones: [],
    painTypes: [],
    bristolType: null,
  }));

  protected get digestiveRows(): SymptomRow[] {
    return this.rows.filter(r => r.category === 'digestive');
  }
  protected get systemicRows(): SymptomRow[] {
    return this.rows.filter(r => r.category === 'systemic');
  }
  protected get wellbeingRows(): SymptomRow[] {
    return this.rows.filter(r => r.category === 'wellbeing');
  }

  protected get hasAnyRating(): boolean {
    return this.rows.some(r => r.intensity > 0 || (r.hasBristol && r.bristolType !== null));
  }

  protected markDirty(): void {
    this.cdr.markForCheck();
  }

  protected togglePainType(row: SymptomRow, type: PainType): void {
    const idx = row.painTypes.indexOf(type);
    if (idx >= 0) {
      row.painTypes = row.painTypes.filter(t => t !== type);
    } else {
      row.painTypes = [...row.painTypes, type];
    }
    this.cdr.markForCheck();
  }

  protected async submit(): Promise<void> {
    if (!this.hasAnyRating || this.saving) return;
    this.saving = true;
    this.cdr.markForCheck();

    const now = new Date();
    const rowsToSave = this.rows.filter(
      r => r.intensity > 0 || (r.hasBristol && r.bristolType !== null),
    );

    await Promise.all(
      rowsToSave.map(row => {
        const input = {
          occurredAt: now,
          category: row.category,
          symptomKey: row.key,
          intensity: row.intensity || 5,
          ...(row.painZones.length > 0 && { painZones: row.painZones }),
          ...(row.painTypes.length > 0 && { painTypes: row.painTypes }),
          ...(row.hasBristol && row.bristolType !== null && {
            stool: { bristolType: row.bristolType },
          }),
        };
        return this.addSymptom.execute(input);
      }),
    );

    void this.router.navigate(['/journal']);
  }

  protected back(): void {
    void this.router.navigate(['/journal']);
  }
}
