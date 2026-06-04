import { Component, inject, signal, OnInit } from '@angular/core';
import { StorageService } from '../../../core/services/storage.service';

import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

interface SymptomConfig {
  readonly id: string;
  readonly key: string;
  readonly label: string;
  readonly order: number;
  readonly active: boolean;
  readonly custom: boolean;
}

const DEFAULT_SYMPTOMS: Omit<SymptomConfig, 'order'>[] = [
  { id: 'abdominal_pain', key: 'abdominal_pain', label: 'Douleur abdominale',    active: true, custom: false },
  { id: 'bloating',       key: 'bloating',       label: 'Ballonnements',         active: true, custom: false },
  { id: 'nausea',         key: 'nausea',         label: 'Nausées',               active: true, custom: false },
  { id: 'heartburn',      key: 'heartburn',      label: 'Brûlures d\'estomac',   active: true, custom: false },
  { id: 'transit',        key: 'transit',        label: 'Transit (Bristol)',      active: true, custom: false },
  { id: 'gas',            key: 'gas',            label: 'Gaz / Flatulences',     active: true, custom: false },
  { id: 'fatigue',        key: 'fatigue',        label: 'Fatigue',               active: true, custom: false },
  { id: 'headache',       key: 'headache',       label: 'Maux de tête',          active: true, custom: false },
  { id: 'brain_fog',      key: 'brain_fog',      label: 'Brouillard mental',     active: true, custom: false },
  { id: 'joint_pain',     key: 'joint_pain',     label: 'Douleurs articulaires', active: true, custom: false },
  { id: 'energy',         key: 'energy',         label: 'Énergie globale',       active: true, custom: false },
  { id: 'sleep_quality',  key: 'sleep_quality',  label: 'Qualité du sommeil',    active: true, custom: false },
  { id: 'mood',           key: 'mood',           label: 'Humeur',                active: true, custom: false },
  { id: 'stress',         key: 'stress',         label: 'Stress',               active: true, custom: false },
];

/**
 * Configuration personnalisée des symptômes suivis, avec réordonnancement drag-drop.
 *
 * @remarks
 * Respecte SRP — gestion de la liste et de l'ordre des symptômes uniquement.
 * L'ordre est persisté dans le store 'symptom-config' via STORAGE_PORT.
 */
@Component({
  selector: 'app-symptoms-config',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatListModule,
    MatDividerModule,
    DragDropModule
],
  templateUrl: './symptoms-config.component.html',
  styleUrl: './symptoms-config.component.scss',
})
export class SymptomsConfigComponent implements OnInit {
  private readonly storage = inject(StorageService);
  private readonly snackBar = inject(MatSnackBar);

  protected symptoms = signal<SymptomConfig[]>([]);
  protected newSymptomLabel = '';

  async ngOnInit(): Promise<void> {
    const saved = await this.storage.getAll('symptom-config') as SymptomConfig[];
    if (saved.length > 0) {
      this.symptoms.set(saved.sort((a, b) => a.order - b.order));
    } else {
      this.symptoms.set(DEFAULT_SYMPTOMS.map((s, i) => ({ ...s, order: i })));
    }
  }

  protected onDrop(event: CdkDragDrop<SymptomConfig[]>): void {
    const items = [...this.symptoms()];
    moveItemInArray(items, event.previousIndex, event.currentIndex);
    this.symptoms.set(items.map((s, i) => ({ ...s, order: i })));
  }

  protected onToggle(symptom: SymptomConfig): void {
    this.symptoms.update(list =>
      list.map(s => s.id === symptom.id ? { ...s, active: !s.active } : s),
    );
  }

  protected onAddCustom(): void {
    const label = this.newSymptomLabel.trim();
    if (!label) return;

    const newSymptom: SymptomConfig = {
      id: crypto.randomUUID(),
      key: label.toLowerCase().replace(/\s+/g, '_'),
      label,
      order: this.symptoms().length,
      active: true,
      custom: true,
    };

    this.symptoms.update(list => [...list, newSymptom]);
    this.newSymptomLabel = '';
  }

  protected onDelete(symptom: SymptomConfig): void {
    this.symptoms.update(list => list.filter(s => s.id !== symptom.id));
  }

  protected async onSave(): Promise<void> {
    try {
      await this.storage.clear('symptom-config');
      for (const symptom of this.symptoms()) {
        await this.storage.save('symptom-config', symptom);
      }
      this.snackBar.open('Configuration enregistrée', 'OK', { duration: 2000 });
    } catch {
      this.snackBar.open('Erreur lors de la sauvegarde', 'OK', { duration: 3000 });
    }
  }
}