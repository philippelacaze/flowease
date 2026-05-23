import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import type { StorageRepository } from '../../../../domain/repositories/storage.repository';
import type { TreatmentEntity, TreatmentCategory, TreatmentMode } from '../../../../domain/entities/treatment.entity';
import { STORAGE_PORT } from '../../../../application/tokens';

/**
 * Gestion CRUD des traitements médicaux de l'utilisateur.
 *
 * @remarks
 * Respecte SRP — persiste directement via STORAGE_PORT (pas de use case dédié
 * pour le CRUD basique ; un use case serait pertinent si des règles métier
 * s'ajoutaient autour des traitements).
 */
@Component({
  selector: 'app-treatments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule,
    MatListModule,
    MatChipsModule,
    MatExpansionModule,
    MatDividerModule,
  ],
  template: `
    <div class="treatments-page">
      <header class="page-header">
        <a mat-icon-button routerLink=".." aria-label="Retour aux paramètres">
          <mat-icon>arrow_back</mat-icon>
        </a>
        <h1>Traitements</h1>
        <button
          mat-icon-button
          (click)="onAdd()"
          aria-label="Ajouter un traitement"
          data-testid="add-treatment-btn">
          <mat-icon>add</mat-icon>
        </button>
      </header>

      <!-- Liste des traitements -->
      @if (treatments().length === 0) {
        <div class="empty-state" data-testid="empty-treatments">
          <mat-icon>medication</mat-icon>
          <p>Aucun traitement enregistré.</p>
          <button mat-stroked-button (click)="onAdd()">Ajouter un traitement</button>
        </div>
      } @else {
        <mat-accordion>
          @for (treatment of treatments(); track treatment.id) {
            <mat-expansion-panel [attr.data-testid]="'treatment-' + treatment.id">
              <mat-expansion-panel-header>
                <mat-panel-title>
                  <mat-icon class="treatment-icon">medication</mat-icon>
                  {{ treatment.name }}
                </mat-panel-title>
                <mat-panel-description>
                  {{ treatment.dosage }} {{ treatment.unit }} — {{ treatment.frequency }}×/j
                  @if (!treatment.active) {
                    <mat-chip class="inactive-chip">Inactif</mat-chip>
                  }
                </mat-panel-description>
              </mat-expansion-panel-header>

              <div class="treatment-detail">
                <p><strong>Catégorie :</strong> {{ treatment.category }}</p>
                <p><strong>Mode :</strong> {{ treatment.mode }}</p>
                @if (treatment.notes) {
                  <p><strong>Notes :</strong> {{ treatment.notes }}</p>
                }
                <p><strong>Début :</strong> {{ treatment.startedAt | date:'dd/MM/yyyy' }}</p>
                @if (treatment.endedAt) {
                  <p><strong>Fin :</strong> {{ treatment.endedAt | date:'dd/MM/yyyy' }}</p>
                }

                <div class="treatment-actions">
                  <mat-slide-toggle
                    [checked]="treatment.active"
                    (change)="onToggleActive(treatment, $event.checked)"
                    [attr.aria-label]="treatment.active ? 'Désactiver ' + treatment.name : 'Activer ' + treatment.name"
                    [attr.data-testid]="'toggle-' + treatment.id">
                    {{ treatment.active ? 'Actif' : 'Inactif' }}
                  </mat-slide-toggle>
                  <button
                    mat-icon-button
                    color="warn"
                    (click)="onDelete(treatment)"
                    [attr.aria-label]="'Supprimer ' + treatment.name"
                    [attr.data-testid]="'delete-' + treatment.id">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>
            </mat-expansion-panel>
          }
        </mat-accordion>
      }

      <!-- Formulaire d'ajout -->
      @if (showForm()) {
        <div class="add-form" data-testid="add-form">
          <h2>Nouveau traitement</h2>
          <form [formGroup]="form" (ngSubmit)="onSave()" class="form-fields">

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nom du traitement</mat-label>
              <input matInput formControlName="name" aria-label="Nom du traitement" data-testid="treatment-name" />
            </mat-form-field>

            <div class="row-fields">
              <mat-form-field appearance="outline">
                <mat-label>Dosage</mat-label>
                <input matInput formControlName="dosage" aria-label="Dosage" data-testid="treatment-dosage" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Unité</mat-label>
                <input matInput formControlName="unit" placeholder="mg, ml…" aria-label="Unité" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Prises/jour</mat-label>
                <input matInput type="number" formControlName="frequency" min="1" aria-label="Fréquence quotidienne" />
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Catégorie</mat-label>
              <mat-select formControlName="category" aria-label="Catégorie" data-testid="treatment-category">
                <mat-option value="antibiotic">Antibiotique</mat-option>
                <mat-option value="probiotic">Probiotique</mat-option>
                <mat-option value="prokinetic">Prokinétique</mat-option>
                <mat-option value="antispasmodic">Antispasmodique</mat-option>
                <mat-option value="supplement">Complément</mat-option>
                <mat-option value="enzyme">Enzyme</mat-option>
                <mat-option value="other">Autre</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Mode d'administration</mat-label>
              <mat-select formControlName="mode" aria-label="Mode d'administration">
                <mat-option value="oral">Oral</mat-option>
                <mat-option value="sublingual">Sublingual</mat-option>
                <mat-option value="topical">Cutané</mat-option>
                <mat-option value="injectable">Injectable</mat-option>
                <mat-option value="inhaled">Inhalé</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Notes (facultatif)</mat-label>
              <textarea matInput formControlName="notes" rows="2" aria-label="Notes sur le traitement"></textarea>
            </mat-form-field>

            <div class="form-actions">
              <button mat-stroked-button type="button" (click)="showForm.set(false)">Annuler</button>
              <button
                mat-raised-button
                color="primary"
                type="submit"
                [disabled]="form.invalid"
                aria-label="Enregistrer le traitement"
                data-testid="save-treatment-btn">
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
  styles: [`
    .treatments-page {
      max-width: 640px;
      margin: 0 auto;
      padding: 16px;
    }
    .page-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    .page-header h1 {
      flex: 1;
      font-size: 1.4rem;
      margin: 0;
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 48px 16px;
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
    }
    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
    }
    .treatment-icon {
      margin-right: 8px;
      vertical-align: middle;
    }
    .inactive-chip {
      margin-left: 8px;
      font-size: 0.75rem;
    }
    .treatment-detail {
      padding: 8px 0;
    }
    .treatment-detail p {
      margin: 4px 0;
      font-size: 0.9rem;
    }
    .treatment-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 12px;
    }
    .add-form {
      margin-top: 24px;
      padding: 16px;
      border-radius: 8px;
      background: var(--mat-sys-surface-container);
    }
    .add-form h2 {
      font-size: 1.1rem;
      margin: 0 0 16px;
    }
    .form-fields {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .full-width { width: 100%; }
    .row-fields {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .row-fields mat-form-field {
      flex: 1;
      min-width: 100px;
    }
    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 8px;
    }
  `],
})
export class TreatmentsComponent implements OnInit {
  private readonly storage = inject<StorageRepository<TreatmentEntity>>(STORAGE_PORT as never);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  protected treatments = signal<TreatmentEntity[]>([]);
  protected showForm = signal(false);

  protected readonly form = this.fb.group({
    name: ['', Validators.required],
    dosage: ['', Validators.required],
    unit: ['mg'],
    frequency: [1, [Validators.required, Validators.min(1)]],
    category: ['other' as TreatmentCategory, Validators.required],
    mode: ['oral' as TreatmentMode, Validators.required],
    notes: [''],
  });

  async ngOnInit(): Promise<void> {
    await this.loadTreatments();
  }

  private async loadTreatments(): Promise<void> {
    const all = await this.storage.getAll('treatments') as TreatmentEntity[];
    this.treatments.set(all.sort((a, b) => a.name.localeCompare(b.name)));
  }

  protected onAdd(): void {
    this.form.reset({ category: 'other', mode: 'oral', frequency: 1, unit: 'mg' });
    this.showForm.set(true);
  }

  protected async onSave(): Promise<void> {
    if (this.form.invalid) return;
    const { name, dosage, unit, frequency, category, mode, notes } = this.form.value;

    const treatment: TreatmentEntity = {
      id: crypto.randomUUID(),
      name: name!,
      dosage: dosage!,
      unit: unit ?? 'mg',
      frequency: frequency ?? 1,
      category: (category ?? 'other') as TreatmentCategory,
      mode: (mode ?? 'oral') as TreatmentMode,
      notes: notes ?? '',
      active: true,
      startedAt: new Date(),
      reminder: { enabled: false, times: [], soundEnabled: false },
      createdAt: new Date(),
    };

    await this.storage.save('treatments', treatment);
    this.showForm.set(false);
    await this.loadTreatments();
    this.snackBar.open('Traitement enregistré', 'OK', { duration: 2000 });
  }

  protected async onToggleActive(treatment: TreatmentEntity, active: boolean): Promise<void> {
    await this.storage.save('treatments', { ...treatment, active });
    await this.loadTreatments();
  }

  protected async onDelete(treatment: TreatmentEntity): Promise<void> {
    await this.storage.delete('treatments', treatment.id);
    await this.loadTreatments();
    this.snackBar.open('Traitement supprimé', 'OK', { duration: 2000 });
  }
}
