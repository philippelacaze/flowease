import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
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
import type { CureEntity, CureStatus } from '../../../../domain/entities/cure.entity';
import { STORAGE_PORT } from '../../../../application/tokens';
import { GetCuresUseCase } from '../../../../application/settings/get-cures.usecase';
import { CreateCureUseCase } from '../../../../application/settings/create-cure.usecase';

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
    DatePipe,
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
  private readonly cureStorage = inject<StorageRepository<CureEntity>>(STORAGE_PORT as never);
  private readonly getCures = inject(GetCuresUseCase);
  private readonly createCure = inject(CreateCureUseCase);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  protected treatments = signal<TreatmentEntity[]>([]);
  protected cures = signal<CureEntity[]>([]);
  protected showForm = signal(false);
  protected showCureForm = signal(false);

  protected readonly form = this.fb.group({
    name: ['', Validators.required],
    dosage: ['', Validators.required],
    unit: ['mg'],
    frequency: [1, [Validators.required, Validators.min(1)]],
    category: ['other' as TreatmentCategory, Validators.required],
    mode: ['oral' as TreatmentMode, Validators.required],
    notes: [''],
  });

  protected readonly cureForm = this.fb.group({
    name: ['', Validators.required],
    durationDays: [14, [Validators.required, Validators.min(1), Validators.max(365)]],
    startDate: [new Date().toISOString().slice(0, 10), Validators.required],
    notes: [''],
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadTreatments(), this.loadCures()]);
  }

  private async loadTreatments(): Promise<void> {
    const all = await this.storage.getAll('treatments') as TreatmentEntity[];
    this.treatments.set(all.sort((a, b) => a.name.localeCompare(b.name)));
  }

  private async loadCures(): Promise<void> {
    this.cures.set(await this.getCures.execute());
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

  protected onAddCure(): void {
    this.cureForm.reset({
      name: '',
      durationDays: 14,
      startDate: new Date().toISOString().slice(0, 10),
      notes: '',
    });
    this.showCureForm.set(true);
  }

  protected async onSaveCure(): Promise<void> {
    if (this.cureForm.invalid) return;
    const { name, durationDays, startDate, notes } = this.cureForm.value;
    await this.createCure.execute({
      name: name!,
      treatmentIds: [],
      durationDays: durationDays ?? 14,
      startedAt: new Date(startDate!),
      notes: notes ?? '',
    });
    this.showCureForm.set(false);
    await this.loadCures();
    this.snackBar.open('Cure démarrée', 'OK', { duration: 2000 });
  }

  protected async onUpdateCureStatus(cure: CureEntity, status: CureStatus): Promise<void> {
    const updated: CureEntity = {
      ...cure,
      status,
      endedAt: status === 'completed' || status === 'abandoned' ? new Date() : cure.endedAt,
    };
    await this.cureStorage.save('cures', updated);
    await this.loadCures();
  }

  protected async onDeleteCure(cure: CureEntity): Promise<void> {
    await this.cureStorage.delete('cures', cure.id);
    await this.loadCures();
    this.snackBar.open('Cure supprimée', 'OK', { duration: 2000 });
  }

  protected cureStatusLabel(status: CureStatus): string {
    const labels: Record<CureStatus, string> = {
      planned: 'Planifiée',
      active: 'En cours',
      paused: 'En pause',
      completed: 'Terminée',
      abandoned: 'Abandonnée',
    };
    return labels[status] ?? status;
  }
}
