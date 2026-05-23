import { Component, inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import type { JournalEntry } from '../../../../application/journal/get-journal-day.usecase';
import type { LinkedEntry } from '../../../../domain/entities/note.entity';

/**
 * Contenu du bottom sheet pour lier une note aux entrées du jour.
 *
 * @remarks
 * Reçoit les entrées du jour via MAT_BOTTOM_SHEET_DATA.
 * Retourne un tableau de LinkedEntry via MatBottomSheetRef.dismiss().
 * Seules les entrées de type meal, symptom et intake sont liables.
 */
@Component({
  selector: 'app-link-entries-sheet',
  standalone: true,
  imports: [NgFor, NgIf, MatListModule, MatIconModule, MatButtonModule, MatCheckboxModule],
  template: `
    <div class="link-sheet">
      <h2 class="link-title" id="link-sheet-title">Lier à des entrées du jour</h2>

      <div
        *ngIf="entries.length === 0"
        class="no-entries"
        role="status"
      >
        Aucune entrée disponible pour ce jour.
      </div>

      <mat-selection-list
        *ngIf="entries.length > 0"
        aria-labelledby="link-sheet-title"
        (selectionChange)="onSelectionChange($event.source.selectedOptions.selected)"
      >
        <mat-list-option
          *ngFor="let entry of entries"
          [value]="entry"
          [attr.aria-label]="entryLabel(entry)"
          checkboxPosition="before"
        >
          <mat-icon matListItemIcon aria-hidden="true">{{ entryIcon(entry) }}</mat-icon>
          <span matListItemTitle>{{ entryLabel(entry) }}</span>
        </mat-list-option>
      </mat-selection-list>

      <div class="link-actions">
        <button
          mat-button
          aria-label="Annuler"
          (click)="cancel()"
        >Annuler</button>
        <button
          mat-raised-button
          color="primary"
          aria-label="Confirmer la sélection"
          (click)="confirm()"
        >Confirmer ({{ selectedEntries.length }})</button>
      </div>
    </div>
  `,
  styles: [`
    .link-sheet { padding: 16px; }
    .link-title {
      margin: 0 0 12px;
      font-size: 16px;
      font-weight: 600;
    }
    .no-entries {
      padding: 16px 0;
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
      font-size: 14px;
    }
    .link-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
    }
  `],
})
export class LinkEntriesSheetComponent {
  private readonly ref = inject(MatBottomSheetRef<LinkEntriesSheetComponent, LinkedEntry[]>);
  protected readonly entries: JournalEntry[] = inject(MAT_BOTTOM_SHEET_DATA) as JournalEntry[];
  protected selectedEntries: JournalEntry[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected onSelectionChange(selected: any[]): void {
    this.selectedEntries = selected.map(s => s.value as JournalEntry);
  }

  protected entryLabel(entry: JournalEntry): string {
    switch (entry.kind) {
      case 'meal':
        return `Repas — ${this.mealTypeLabel(entry.data.type)} (${entry.data.items.length} aliment(s))`;
      case 'symptom':
        return `Symptôme — ${entry.data.symptomKey} (${entry.data.intensity}/10)`;
      case 'intake':
        return `Prise — ${entry.data.treatmentId} (${entry.data.status === 'taken' ? 'pris' : 'sauté'})`;
      default:
        return 'Entrée';
    }
  }

  protected entryIcon(entry: JournalEntry): string {
    const icons: Record<string, string> = {
      meal: 'restaurant',
      symptom: 'health_and_safety',
      intake: 'medication',
    };
    return icons[entry.kind] ?? 'edit_note';
  }

  protected cancel(): void {
    this.ref.dismiss([]);
  }

  protected confirm(): void {
    const linked: LinkedEntry[] = this.selectedEntries
      .filter((e): e is Exclude<JournalEntry, { kind: 'note' }> => e.kind !== 'note')
      .map(e => ({
        entryId: e.data.id,
        entryType: e.kind as LinkedEntry['entryType'],
      }));
    this.ref.dismiss(linked);
  }

  private mealTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      breakfast: 'Petit-déjeuner',
      lunch: 'Déjeuner',
      dinner: 'Dîner',
      snack: 'Collation',
    };
    return labels[type] ?? type;
  }
}
