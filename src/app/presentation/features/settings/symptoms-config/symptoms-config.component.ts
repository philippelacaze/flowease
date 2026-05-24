import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import type { StorageRepository } from '../../../../domain/repositories/storage.repository';
import { STORAGE_PORT } from '../../../../application/tokens';

interface SymptomConfig {
  readonly id: string;
  readonly key: string;
  readonly label: string;
  readonly order: number;
  readonly active: boolean;
  readonly custom: boolean;
}

const DEFAULT_SYMPTOMS: Omit<SymptomConfig, 'order'>[] = [
  { id: 'bloating', key: 'bloating', label: 'Ballonnements', active: true, custom: false },
  { id: 'pain', key: 'pain', label: 'Douleur abdominale', active: true, custom: false },
  { id: 'nausea', key: 'nausea', label: 'Nausées', active: true, custom: false },
  { id: 'fatigue', key: 'fatigue', label: 'Fatigue', active: true, custom: false },
  { id: 'brain_fog', key: 'brain_fog', label: 'Brouillard cérébral', active: true, custom: false },
  { id: 'transit', key: 'transit', label: 'Transit (Bristol)', active: true, custom: false },
  { id: 'gas', key: 'gas', label: 'Gaz / flatulences', active: true, custom: false },
  { id: 'reflux', key: 'reflux', label: 'Reflux', active: true, custom: false },
  { id: 'appetite', key: 'appetite', label: 'Appétit', active: true, custom: false },
  { id: 'wellbeing', key: 'wellbeing', label: 'Bien-être général', active: true, custom: false },
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
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatListModule,
    MatDividerModule,
    DragDropModule,
  ],
  templateUrl: './symptoms-config.component.html',
  styleUrl: './symptoms-config.component.scss',
})
export class SymptomsConfigComponent implements OnInit {
  private readonly storage = inject<StorageRepository<SymptomConfig>>(STORAGE_PORT as never);
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
