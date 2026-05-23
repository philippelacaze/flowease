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
  template: `
    <div class="symptom-entry">
      <header class="page-header">
        <button mat-icon-button aria-label="Retour au journal" (click)="back()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1 class="page-title">Saisir des symptômes</h1>
      </header>

      <div class="symptom-form">
        <!-- Bloc Digestifs -->
        <section class="symptom-section" aria-label="Symptômes digestifs">
          <h2 class="section-title">
            <mat-icon aria-hidden="true">health_and_safety</mat-icon>
            Digestifs
          </h2>
          <ng-container *ngFor="let row of digestiveRows">
            <div class="symptom-row" [attr.data-testid]="'symptom-' + row.key">
              <!-- Bristol (transit) -->
              <ng-container *ngIf="row.hasBristol; else regularRow">
                <h3 class="symptom-row-title">{{ row.labelFr }}</h3>
                <app-intensity-slider
                  [label]="'Intensité de la gêne'"
                  [value]="row.intensity"
                  (valueChange)="row.intensity = $event; markDirty()"
                />
                <div class="bristol-section">
                  <p class="bristol-hint">Type de selle :</p>
                  <app-bristol-scale
                    [value]="row.bristolType"
                    (valueChange)="row.bristolType = $event; markDirty()"
                  />
                </div>
              </ng-container>

              <!-- Row standard -->
              <ng-template #regularRow>
                <app-intensity-slider
                  [label]="row.labelFr"
                  [value]="row.intensity"
                  (valueChange)="row.intensity = $event; markDirty()"
                />

                <!-- Abdominal map -->
                <div *ngIf="row.hasMap && row.intensity > 0" class="pain-detail">
                  <p class="pain-detail-label">Localisation :</p>
                  <app-abdominal-map
                    [selectedZones]="row.painZones"
                    (zonesChange)="row.painZones = $event; markDirty()"
                  />
                </div>

                <!-- Pain types -->
                <div *ngIf="row.hasPainTypes && row.intensity > 0" class="pain-types">
                  <p class="pain-detail-label">Type de douleur :</p>
                  <div class="pain-type-grid" role="group" aria-label="Types de douleur">
                    <button
                      *ngFor="let pt of painTypes"
                      class="pain-type-btn"
                      [class.pain-type-btn--selected]="row.painTypes.includes(pt.id)"
                      [attr.aria-label]="pt.labelFr + (row.painTypes.includes(pt.id) ? ' — sélectionné' : '')"
                      [attr.aria-pressed]="row.painTypes.includes(pt.id)"
                      (click)="togglePainType(row, pt.id)"
                    >{{ pt.labelFr }}</button>
                  </div>
                </div>
              </ng-template>
            </div>
          </ng-container>
        </section>

        <!-- Bloc Systémiques -->
        <section class="symptom-section" aria-label="Symptômes systémiques">
          <h2 class="section-title">
            <mat-icon aria-hidden="true">person</mat-icon>
            Systémiques
          </h2>
          <div
            *ngFor="let row of systemicRows"
            class="symptom-row"
            [attr.data-testid]="'symptom-' + row.key"
          >
            <app-intensity-slider
              [label]="row.labelFr"
              [value]="row.intensity"
              (valueChange)="row.intensity = $event; markDirty()"
            />
          </div>
        </section>

        <!-- Bloc Bien-être -->
        <section class="symptom-section" aria-label="Indicateurs de bien-être">
          <h2 class="section-title">
            <mat-icon aria-hidden="true">sentiment_satisfied</mat-icon>
            Bien-être
          </h2>
          <div
            *ngFor="let row of wellbeingRows"
            class="symptom-row"
            [attr.data-testid]="'symptom-' + row.key"
          >
            <app-intensity-slider
              [label]="row.labelFr"
              [value]="row.intensity"
              (valueChange)="row.intensity = $event; markDirty()"
            />
          </div>
        </section>
      </div>

      <div class="submit-row">
        <p *ngIf="!hasAnyRating" class="no-rating-hint" role="status">
          Déplacez au moins un curseur pour activer la validation
        </p>
        <button
          mat-raised-button
          color="primary"
          class="submit-btn"
          [disabled]="!hasAnyRating || saving"
          aria-label="Valider et enregistrer les symptômes"
          data-testid="submit-symptoms"
          (click)="submit()"
        >
          <mat-icon aria-hidden="true">check</mat-icon>
          {{ saving ? 'Enregistrement…' : 'Valider les symptômes' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .page-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 8px;
      background: var(--mat-sys-surface);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .page-title { margin: 0; font-size: 18px; font-weight: 500; }

    .symptom-form { padding: 8px 16px 0; }

    .symptom-section { margin-bottom: 20px; }

    .section-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--mat-sys-primary);
      margin: 0 0 12px;
    }
    .section-title mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .symptom-row {
      padding: 12px 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .symptom-row:last-child { border-bottom: none; }

    .symptom-row-title {
      margin: 0 0 8px;
      font-size: 14px;
      font-weight: 500;
    }

    .bristol-section { margin-top: 12px; }
    .bristol-hint {
      margin: 0 0 8px;
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
    }

    .pain-detail { margin-top: 12px; }
    .pain-detail-label {
      margin: 0 0 8px;
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
    }

    .pain-types { margin-top: 12px; }
    .pain-type-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .pain-type-btn {
      min-height: 44px;
      padding: 8px 14px;
      border: 1.5px solid var(--mat-sys-outline-variant);
      border-radius: 22px;
      background: transparent;
      cursor: pointer;
      font-size: 13px;
      transition: background 0.15s, border-color 0.15s;
    }
    .pain-type-btn--selected {
      background: var(--mat-sys-primary-container);
      border-color: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary-container);
    }

    .submit-row {
      padding: 12px 16px 24px;
      background: var(--mat-sys-surface);
      border-top: 1px solid var(--mat-sys-outline-variant);
    }
    .no-rating-hint {
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
      margin: 0 0 8px;
      text-align: center;
    }
    .submit-btn { width: 100%; }
  `],
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
