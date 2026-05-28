import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  OnInit,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
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
 * Page de saisie des symptômes — header contextuel (voice/form), ajout personnalisé, confirmation.
 *
 * @remarks
 * srcMode lu depuis queryParams.mode : 'voice' → dictée préanalysée, 'form' → saisie manuelle.
 * Les symptômes personnalisés s'ajoutent à customSymptoms et sont sauvegardés comme les autres.
 * submit() navigue vers /journal/symptom/confirm avec les données enregistrées dans history.state.
 */
@Component({
  selector: 'app-symptom-entry',
  standalone: true,
  imports: [
    FormsModule,
    IntensitySliderComponent,
    AbdominalMapComponent,
    BristolScaleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './symptom-entry.component.html',
  styleUrl: './symptom-entry.component.scss',
})
export class SymptomEntryComponent implements OnInit {
  private readonly addSymptom = inject(AddSymptomUseCase);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly painTypes = PAIN_TYPES;
  protected saving = false;

  protected srcMode: 'voice' | 'form' = 'form';
  protected showAddCustom = false;
  protected newCustomLabel = '';
  protected customSymptoms: SymptomRow[] = [];

  protected readonly rows: SymptomRow[] = SYMPTOM_DEFINITIONS.map(def => ({
    ...def,
    intensity: 0,
    painZones: [],
    painTypes: [],
    bristolType: null,
  }));

  protected get allRows(): SymptomRow[] {
    return [...this.rows, ...this.customSymptoms];
  }

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
    return this.allRows.some(r => r.intensity > 0 || (r.hasBristol && r.bristolType !== null));
  }

  protected get avgScore(): number {
    const active = this.allRows.filter(r => r.intensity > 0);
    if (active.length === 0) return 0;
    return Math.round(active.reduce((acc, r) => acc + r.intensity, 0) / active.length);
  }

  protected get avgSeverityClass(): string {
    const s = this.avgScore;
    if (s <= 3) return 'score-low';
    if (s <= 6) return 'score-medium';
    return 'score-high';
  }

  protected get activeCount(): number {
    return this.allRows.filter(r => r.intensity > 0 || (r.hasBristol && r.bristolType !== null)).length;
  }

  ngOnInit(): void {
    const mode = this.route.snapshot.queryParams['mode'] as string | undefined;
    this.srcMode = mode === 'voice' ? 'voice' : 'form';
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

  protected addCustomSymptom(): void {
    const label = this.newCustomLabel.trim();
    if (!label) return;
    this.customSymptoms = [
      ...this.customSymptoms,
      {
        category: 'systemic',
        key: `custom_${Date.now()}`,
        labelFr: label,
        hasMap: false,
        hasPainTypes: false,
        hasBristol: false,
        intensity: 0,
        painZones: [],
        painTypes: [],
        bristolType: null,
      },
    ];
    this.cancelCustom();
    this.cdr.markForCheck();
  }

  protected cancelCustom(): void {
    this.showAddCustom = false;
    this.newCustomLabel = '';
  }

  protected async submit(): Promise<void> {
    if (!this.hasAnyRating || this.saving) return;
    this.saving = true;
    this.cdr.markForCheck();

    const now = new Date();
    const rowsToSave = this.allRows.filter(
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

    const savedItems = rowsToSave.map(r => ({
      key: r.key,
      labelFr: r.labelFr,
      intensity: r.intensity,
      category: r.category as string,
    }));

    void this.router.navigate(['/journal/symptom/confirm'], { state: { savedItems } })
      .catch(() => undefined);
  }

  protected back(): void {
    void this.router.navigate(['/journal']).catch(() => undefined);
  }
}
