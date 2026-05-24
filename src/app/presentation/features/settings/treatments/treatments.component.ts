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
  templateUrl: './treatments.component.html',
  styleUrl: './treatments.component.scss',
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
