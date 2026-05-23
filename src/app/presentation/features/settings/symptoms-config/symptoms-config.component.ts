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
  template: `
    <div class="symptoms-config-page">
      <header class="page-header">
        <a mat-icon-button routerLink=".." aria-label="Retour aux paramètres">
          <mat-icon>arrow_back</mat-icon>
        </a>
        <h1>Symptômes suivis</h1>
      </header>

      <p class="hint">Faites glisser pour réordonner. Appuyez sur l'icône pour activer/désactiver.</p>

      <!-- Liste drag-drop -->
      <div
        cdkDropList
        [cdkDropListData]="symptoms()"
        (cdkDropListDropped)="onDrop($event)"
        class="symptom-list"
        aria-label="Liste des symptômes, glissez pour réordonner">

        @for (symptom of symptoms(); track symptom.id) {
          <div
            cdkDrag
            class="symptom-item"
            [class.inactive]="!symptom.active"
            [attr.data-testid]="'symptom-' + symptom.id"
            [attr.aria-label]="symptom.label + (symptom.active ? '' : ' (désactivé)')">

            <mat-icon cdkDragHandle class="drag-handle" aria-label="Déplacer">drag_indicator</mat-icon>

            <span class="symptom-label">{{ symptom.label }}</span>

            @if (symptom.custom) {
              <mat-icon class="custom-badge" aria-label="Symptôme personnalisé">star</mat-icon>
            }

            <button
              mat-icon-button
              (click)="onToggle(symptom)"
              [attr.aria-label]="(symptom.active ? 'Désactiver ' : 'Activer ') + symptom.label"
              [attr.data-testid]="'toggle-' + symptom.id">
              <mat-icon>{{ symptom.active ? 'visibility' : 'visibility_off' }}</mat-icon>
            </button>

            @if (symptom.custom) {
              <button
                mat-icon-button
                color="warn"
                (click)="onDelete(symptom)"
                [attr.aria-label]="'Supprimer ' + symptom.label"
                [attr.data-testid]="'delete-' + symptom.id">
                <mat-icon>delete</mat-icon>
              </button>
            }
          </div>
        }
      </div>

      <mat-divider />

      <!-- Ajout personnalisé -->
      <div class="add-section">
        <h2 class="section-title">Ajouter un symptôme personnalisé</h2>
        <div class="add-row">
          <mat-form-field appearance="outline" class="add-field">
            <mat-label>Nom du symptôme</mat-label>
            <input
              matInput
              [(ngModel)]="newSymptomLabel"
              aria-label="Nom du nouveau symptôme"
              data-testid="new-symptom-input"
              (keyup.enter)="onAddCustom()" />
          </mat-form-field>
          <button
            mat-raised-button
            color="primary"
            (click)="onAddCustom()"
            [disabled]="!newSymptomLabel.trim()"
            aria-label="Ajouter le symptôme personnalisé"
            data-testid="add-custom-btn"
            class="add-btn">
            <mat-icon>add</mat-icon>
            Ajouter
          </button>
        </div>
      </div>

      <div class="save-actions">
        <button
          mat-raised-button
          color="primary"
          (click)="onSave()"
          aria-label="Enregistrer l'ordre des symptômes"
          data-testid="save-symptoms-btn"
          class="save-btn">
          <mat-icon>save</mat-icon>
          Enregistrer l'ordre
        </button>
      </div>
    </div>
  `,
  styles: [`
    .symptoms-config-page {
      max-width: 640px;
      margin: 0 auto;
      padding: 16px;
    }
    .page-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .page-header h1 {
      font-size: 1.4rem;
      margin: 0;
    }
    .hint {
      font-size: 0.85rem;
      color: var(--mat-sys-on-surface-variant);
      margin-bottom: 16px;
    }
    .symptom-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-height: 60px;
    }
    .symptom-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 4px;
      background: var(--mat-sys-surface-container);
      border-radius: 8px;
      min-height: 52px;
      cursor: default;
    }
    .symptom-item.inactive {
      opacity: 0.5;
    }
    .symptom-item.cdk-drag-preview {
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    .drag-handle {
      cursor: grab;
      color: var(--mat-sys-on-surface-variant);
    }
    .symptom-label {
      flex: 1;
      font-size: 0.95rem;
    }
    .custom-badge {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--mat-sys-tertiary);
    }
    .section-title {
      font-size: 1rem;
      font-weight: 500;
      color: var(--mat-sys-on-surface-variant);
      margin: 16px 0 8px;
    }
    .add-row {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .add-field {
      flex: 1;
      min-width: 200px;
    }
    .add-btn {
      min-height: 44px;
      margin-top: 4px;
    }
    .save-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 16px;
    }
    .save-btn {
      min-height: 44px;
    }
  `],
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
