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
import { EditSymptomUseCase } from '../../../../application/journal/edit-symptom.usecase';
import { GetActiveSymptomsUseCase } from '../../../../application/journal/get-active-symptoms.usecase';
import { IntensitySliderComponent } from '../../../shared/components/intensity-slider/intensity-slider.component';
import { AbdominalMapComponent } from '../../../shared/components/abdominal-map/abdominal-map.component';
import { BristolScaleComponent } from '../../../shared/components/bristol-scale/bristol-scale.component';
import type { SymptomCategory, SymptomEntity } from '../../../../domain/entities/symptom.entity';
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
  stoolBlood: boolean;
  stoolMucus: boolean;
  stoolFrequency: number;
}

type SymptomMeta = Pick<SymptomRow, 'category' | 'hasMap' | 'hasPainTypes' | 'hasBristol'>;

const SYMPTOM_METADATA: Readonly<Record<string, SymptomMeta>> = {
  abdominal_pain: { category: 'digestive', hasMap: true,  hasPainTypes: true,  hasBristol: false },
  bloating:       { category: 'digestive', hasMap: false, hasPainTypes: false, hasBristol: false },
  nausea:         { category: 'digestive', hasMap: false, hasPainTypes: false, hasBristol: false },
  heartburn:      { category: 'digestive', hasMap: false, hasPainTypes: false, hasBristol: false },
  transit:        { category: 'digestive', hasMap: false, hasPainTypes: false, hasBristol: true  },
  gas:            { category: 'digestive', hasMap: false, hasPainTypes: false, hasBristol: false },
  fatigue:        { category: 'systemic',  hasMap: false, hasPainTypes: false, hasBristol: false },
  headache:       { category: 'systemic',  hasMap: false, hasPainTypes: false, hasBristol: false },
  brain_fog:      { category: 'systemic',  hasMap: false, hasPainTypes: false, hasBristol: false },
  joint_pain:     { category: 'systemic',  hasMap: false, hasPainTypes: false, hasBristol: false },
  energy:         { category: 'wellbeing', hasMap: false, hasPainTypes: false, hasBristol: false },
  sleep_quality:  { category: 'wellbeing', hasMap: false, hasPainTypes: false, hasBristol: false },
  mood:           { category: 'wellbeing', hasMap: false, hasPainTypes: false, hasBristol: false },
  stress:         { category: 'wellbeing', hasMap: false, hasPainTypes: false, hasBristol: false },
};

const FALLBACK_META: SymptomMeta = { category: 'systemic', hasMap: false, hasPainTypes: false, hasBristol: false };

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
  private readonly editSymptom = inject(EditSymptomUseCase);
  private readonly getActiveSymptoms = inject(GetActiveSymptomsUseCase);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly painTypes = PAIN_TYPES;
  protected saving = false;

  protected srcMode: 'voice' | 'form' = 'form';
  protected showAddCustom = false;
  protected newCustomLabel = '';
  protected customSymptoms: SymptomRow[] = [];

  protected rows: SymptomRow[] = [];
  private editingEntry: SymptomEntity | null = null;

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
    return this.allRows.some(r => r.intensity > 0 || this.hasStoolData(r));
  }

  protected get showBloodAlert(): boolean {
    return this.rows.some(r => r.hasBristol && r.stoolBlood);
  }

  private hasStoolData(row: SymptomRow): boolean {
    return row.hasBristol && (row.bristolType !== null || row.stoolBlood || row.stoolMucus || row.stoolFrequency > 0);
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
    return this.allRows.filter(r => r.intensity > 0 || this.hasStoolData(r)).length;
  }

  async ngOnInit(): Promise<void> {
    const state = history.state as { editEntry?: SymptomEntity };

    if (state?.editEntry) {
      this.editingEntry = state.editEntry;
      const entry = state.editEntry;
      const meta = SYMPTOM_METADATA[entry.symptomKey] ?? FALLBACK_META;
      const editRow: SymptomRow = {
        ...meta,
        key: entry.symptomKey,
        labelFr: entry.symptomKey,
        intensity: entry.intensity,
        painZones: entry.painZones ? [...entry.painZones] : [],
        painTypes: entry.painTypes ? [...entry.painTypes] : [],
        bristolType: entry.stool?.bristolType ?? null,
        stoolBlood: entry.stool?.blood ?? false,
        stoolMucus: entry.stool?.mucus ?? false,
        stoolFrequency: entry.stool?.frequency ?? 0,
      };
      this.rows = [editRow];
      this.customSymptoms = [];
      this.cdr.markForCheck();
      return;
    }

    const mode = this.route.snapshot.queryParams['mode'] as string | undefined;
    this.srcMode = mode === 'voice' ? 'voice' : 'form';

    const active = await this.getActiveSymptoms.execute();
    const standard: SymptomRow[] = [];
    const fromConfig: SymptomRow[] = [];

    for (const cfg of active) {
      const meta = SYMPTOM_METADATA[cfg.key] ?? FALLBACK_META;
      const row: SymptomRow = {
        ...meta,
        key: cfg.key,
        labelFr: cfg.label,
        intensity: 0,
        painZones: [],
        painTypes: [],
        bristolType: null,
        stoolBlood: false,
        stoolMucus: false,
        stoolFrequency: 0,
      };
      if (cfg.custom) {
        fromConfig.push(row);
      } else {
        standard.push(row);
      }
    }

    this.rows = standard;
    this.customSymptoms = fromConfig;
    this.cdr.markForCheck();
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
        stoolBlood: false,
        stoolMucus: false,
        stoolFrequency: 0,
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
      r => r.intensity > 0 || this.hasStoolData(r),
    );

    if (this.editingEntry) {
      const row = rowsToSave[0];
      if (row) {
        await this.editSymptom.execute({
          id: this.editingEntry.id,
          occurredAt: this.editingEntry.occurredAt,
          category: row.category,
          symptomKey: row.key,
          intensity: row.intensity || 5,
          ...(row.painZones.length > 0 && { painZones: row.painZones }),
          ...(row.painTypes.length > 0 && { painTypes: row.painTypes }),
          ...(this.hasStoolData(row) && {
            stool: {
              bristolType: row.bristolType,
              ...(row.stoolFrequency > 0 && { frequency: row.stoolFrequency }),
              ...(row.stoolBlood && { blood: true }),
              ...(row.stoolMucus && { mucus: true }),
            },
          }),
        });
      }
      void this.router.navigate(['/journal']).catch(() => undefined);
      return;
    }

    await Promise.all(
      rowsToSave.map(row => {
        const input = {
          occurredAt: now,
          category: row.category,
          symptomKey: row.key,
          intensity: row.intensity || 5,
          ...(row.painZones.length > 0 && { painZones: row.painZones }),
          ...(row.painTypes.length > 0 && { painTypes: row.painTypes }),
          ...(this.hasStoolData(row) && {
            stool: {
              bristolType: row.bristolType,
              ...(row.stoolFrequency > 0 && { frequency: row.stoolFrequency }),
              ...(row.stoolBlood && { blood: true }),
              ...(row.stoolMucus && { mucus: true }),
            },
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
