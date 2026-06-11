import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  OnInit,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SymptomService } from '../services/symptom.service';
import { IntensitySliderComponent } from '../../../shared/components/intensity-slider/intensity-slider.component';
import { AbdominalMapComponent } from '../../../shared/components/abdominal-map/abdominal-map.component';
import { BristolScaleComponent } from '../../../shared/components/bristol-scale/bristol-scale.component';
import type { SymptomCategory, SymptomEntity } from '../../../core/models/entities/symptom.entity';
import type { AbdominalZone } from '../../../core/models/value-objects/pain-location.vo';
import type { PainType } from '../../../core/models/value-objects/pain-type.vo';
import type { BristolType } from '../../../core/models/value-objects/bristol-type.vo';
import { PAIN_TYPES } from '../../../core/models/value-objects/pain-type.vo';

interface SymptomRow {
  readonly category: SymptomCategory;
  readonly key: string;
  readonly labelFr: string;
  readonly hasMap: boolean;
  readonly hasPainTypes: boolean;
  readonly hasBristol: boolean;
  readonly hasGas: boolean;
  readonly gasHasOdor: boolean;
  readonly hasYesNo: boolean;
  readonly hasSleepHours: boolean;
  readonly hasDelay: boolean;
  readonly invertedScale: boolean;
  intensity: number;
  painZones: AbdominalZone[];
  painTypes: PainType[];
  bristolType: BristolType | null;
  stoolBlood: boolean;
  stoolMucus: boolean;
  stoolFrequency: number;
  sleepHours: number | null;
  postmealDelay: number | null;
}

type SymptomMeta = Pick<SymptomRow,
  'category' | 'hasMap' | 'hasPainTypes' | 'hasBristol' |
  'hasGas' | 'gasHasOdor' | 'hasYesNo' | 'hasSleepHours' | 'hasDelay' | 'invertedScale'
>;

const F = false, T = true;
const SYMPTOM_METADATA: Readonly<Record<string, SymptomMeta>> = {
  // Bloc A — Digestifs
  abdominal_pain:     { category: 'digestive', hasMap: T, hasPainTypes: T, hasBristol: F, hasGas: F, gasHasOdor: F, hasYesNo: F, hasSleepHours: F, hasDelay: F, invertedScale: F },
  bloating:           { category: 'digestive', hasMap: F, hasPainTypes: F, hasBristol: F, hasGas: F, gasHasOdor: F, hasYesNo: F, hasSleepHours: F, hasDelay: F, invertedScale: F },
  nausea:             { category: 'digestive', hasMap: F, hasPainTypes: F, hasBristol: F, hasGas: F, gasHasOdor: F, hasYesNo: F, hasSleepHours: F, hasDelay: F, invertedScale: F },
  heartburn:          { category: 'digestive', hasMap: F, hasPainTypes: F, hasBristol: F, hasGas: F, gasHasOdor: F, hasYesNo: F, hasSleepHours: F, hasDelay: F, invertedScale: F },
  transit:            { category: 'digestive', hasMap: F, hasPainTypes: F, hasBristol: T, hasGas: F, gasHasOdor: F, hasYesNo: F, hasSleepHours: F, hasDelay: F, invertedScale: F },
  gas:                { category: 'digestive', hasMap: F, hasPainTypes: F, hasBristol: F, hasGas: T, gasHasOdor: T, hasYesNo: F, hasSleepHours: F, hasDelay: F, invertedScale: F },
  belching:           { category: 'digestive', hasMap: F, hasPainTypes: F, hasBristol: F, hasGas: T, gasHasOdor: F, hasYesNo: F, hasSleepHours: F, hasDelay: F, invertedScale: F },
  early_satiety:      { category: 'digestive', hasMap: F, hasPainTypes: F, hasBristol: F, hasGas: F, gasHasOdor: F, hasYesNo: F, hasSleepHours: F, hasDelay: F, invertedScale: F },
  postmeal_heaviness: { category: 'digestive', hasMap: F, hasPainTypes: F, hasBristol: F, hasGas: F, gasHasOdor: F, hasYesNo: F, hasSleepHours: F, hasDelay: T, invertedScale: F },
  // Bloc B — Systémiques
  fatigue:            { category: 'systemic',  hasMap: F, hasPainTypes: F, hasBristol: F, hasGas: F, gasHasOdor: F, hasYesNo: F, hasSleepHours: F, hasDelay: F, invertedScale: F },
  headache:           { category: 'systemic',  hasMap: F, hasPainTypes: F, hasBristol: F, hasGas: F, gasHasOdor: F, hasYesNo: F, hasSleepHours: F, hasDelay: F, invertedScale: F },
  brain_fog:          { category: 'systemic',  hasMap: F, hasPainTypes: F, hasBristol: F, hasGas: F, gasHasOdor: F, hasYesNo: F, hasSleepHours: F, hasDelay: F, invertedScale: F },
  joint_pain:         { category: 'systemic',  hasMap: F, hasPainTypes: F, hasBristol: F, hasGas: F, gasHasOdor: F, hasYesNo: T, hasSleepHours: F, hasDelay: F, invertedScale: F },
  sleep_quality:      { category: 'systemic',  hasMap: F, hasPainTypes: F, hasBristol: F, hasGas: F, gasHasOdor: F, hasYesNo: F, hasSleepHours: T, hasDelay: F, invertedScale: F },
  // Bloc C — Humeur : échelle uniforme 0 = absent → 10 = intense (mal-être, anxiété)
  wellbeing_score:    { category: 'wellbeing', hasMap: F, hasPainTypes: F, hasBristol: F, hasGas: F, gasHasOdor: F, hasYesNo: F, hasSleepHours: F, hasDelay: F, invertedScale: F },
  mood:               { category: 'wellbeing', hasMap: F, hasPainTypes: F, hasBristol: F, hasGas: F, gasHasOdor: F, hasYesNo: F, hasSleepHours: F, hasDelay: F, invertedScale: F },
  // Archivé hors-specs — conservé pour l'historique existant
  stress:             { category: 'wellbeing', hasMap: F, hasPainTypes: F, hasBristol: F, hasGas: F, gasHasOdor: F, hasYesNo: F, hasSleepHours: F, hasDelay: F, invertedScale: F },
};

const FALLBACK_META: SymptomMeta = {
  category: 'systemic', hasMap: F, hasPainTypes: F, hasBristol: F,
  hasGas: F, gasHasOdor: F, hasYesNo: F, hasSleepHours: F, hasDelay: F, invertedScale: F,
};

/**
 * Page de saisie des symptômes — 3 blocs (digestifs, systémiques, humeur), confirmation.
 *
 * @remarks
 * srcMode lu depuis queryParams.mode : 'voice' → dictée préanalysée, 'form' → saisie manuelle.
 * Chaque symptôme est rendu selon ses flags (hasGas, hasYesNo, hasSleepHours, hasDelay, hasBristol).
 * wellbeing_score utilise upsertDaySymptom() pour garantir l'unicité par jour (§1.4.2 Bloc C).
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
      private readonly symptoms = inject(SymptomService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  protected journalDate: Date = new Date();
  protected get isRetrospective(): boolean {
    return this.journalDate.toDateString() !== new Date().toDateString();
  }
  protected get journalDateLabel(): string {
    return this.journalDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  protected readonly painTypes = PAIN_TYPES;
  protected saving = false;

  protected srcMode: 'voice' | 'form' = 'form';
  protected wellbeingNote = '';
  protected rows: SymptomRow[] = [];
  private editingEntry: SymptomEntity | null = null;

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
    return this.rows.some(r => this.hasData(r));
  }

  protected get showBloodAlert(): boolean {
    return this.rows.some(r => r.hasBristol && r.stoolBlood);
  }

  private hasData(row: SymptomRow): boolean {
    if (row.hasBristol) return row.bristolType !== null || row.stoolBlood || row.stoolMucus || row.stoolFrequency > 0 || row.intensity > 0;
    return row.intensity > 0;
  }

  protected get activeCount(): number {
    return this.rows.filter(r => this.hasData(r)).length;
  }

  async ngOnInit(): Promise<void> {
    const state = history.state as { editEntry?: SymptomEntity; journalDate?: string };
    if (state?.journalDate) {
      this.journalDate = new Date(state.journalDate);
    }

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
        sleepHours: entry.sleepHours ?? null,
        postmealDelay: meta.hasDelay && entry.notes
          ? (parseFloat(entry.notes) || null)
          : null,
      };
      this.rows = [editRow];
      if (entry.symptomKey === 'wellbeing_score') {
        this.wellbeingNote = entry.notes ?? '';
      }
      this.cdr.markForCheck();
      return;
    }

    const mode = this.route.snapshot.queryParams['mode'] as string | undefined;
    this.srcMode = mode === 'voice' ? 'voice' : 'form';

    const active = await this.symptoms.getActiveConfigs();
    this.rows = active.map(cfg => {
      const meta = SYMPTOM_METADATA[cfg.key] ?? FALLBACK_META;
      return {
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
        sleepHours: null,
        postmealDelay: null,
      };
    });
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

  protected async submit(): Promise<void> {
    if (!this.hasAnyRating || this.saving) return;
    this.saving = true;
    this.cdr.markForCheck();

    const now = new Date(this.journalDate);
    const rowsToSave = this.rows.filter(r => this.hasData(r));

    if (this.editingEntry) {
      const row = rowsToSave[0];
      if (row) {
        await this.symptoms.edit({
          id: this.editingEntry.id,
          occurredAt: this.editingEntry.occurredAt,
          category: row.category,
          symptomKey: row.key,
          intensity: row.intensity || 5,
          ...(row.painZones.length > 0 && { painZones: row.painZones }),
          ...(row.painTypes.length > 0 && { painTypes: row.painTypes }),
          ...(row.hasBristol && this.hasData(row) && {
            stool: {
              bristolType: row.bristolType,
              ...(row.stoolFrequency > 0 && { frequency: row.stoolFrequency }),
              ...(row.stoolBlood && { blood: true }),
              ...(row.stoolMucus && { mucus: true }),
            },
          }),
          ...(row.hasSleepHours && row.sleepHours !== null && { sleepHours: row.sleepHours }),
          ...(row.hasDelay && row.postmealDelay !== null && { notes: `${row.postmealDelay}h après repas` }),
          ...(row.key === 'wellbeing_score' && this.wellbeingNote.trim() && { notes: this.wellbeingNote.trim() }),
        });
      }
      void this.router.navigate(['/journal'], {
        state: { journalDate: this.journalDate.toISOString() },
      }).catch(() => undefined);
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
          ...(row.hasBristol && this.hasData(row) && {
            stool: {
              bristolType: row.bristolType,
              ...(row.stoolFrequency > 0 && { frequency: row.stoolFrequency }),
              ...(row.stoolBlood && { blood: true }),
              ...(row.stoolMucus && { mucus: true }),
            },
          }),
          ...(row.hasSleepHours && row.sleepHours !== null && { sleepHours: row.sleepHours }),
          ...(row.hasDelay && row.postmealDelay !== null && { notes: `${row.postmealDelay}h après repas` }),
          ...(row.key === 'wellbeing_score' && this.wellbeingNote.trim() && { notes: this.wellbeingNote.trim() }),
        };
        // wellbeing_score : 1 seul par jour calendaire (§1.4.2 Bloc C)
        if (row.key === 'wellbeing_score') {
          return this.symptoms.upsertDaySymptom(input);
        }
        return this.symptoms.add(input);
      }),
    );

    const savedItems = rowsToSave.map(r => ({
      key: r.key,
      labelFr: r.labelFr,
      intensity: r.intensity,
      category: r.category as string,
    }));

    void this.router.navigate(['/journal/symptom/confirm'], {
      state: { savedItems, journalDate: this.journalDate.toISOString() },
    }).catch(() => undefined);
  }

  protected back(): void {
    void this.router.navigate(['/journal'], {
      state: { journalDate: this.journalDate.toISOString() },
    }).catch(() => undefined);
  }
}
