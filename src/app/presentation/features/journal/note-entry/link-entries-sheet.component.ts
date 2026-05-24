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
  templateUrl: './link-entries-sheet.component.html',
  styleUrl: './link-entries-sheet.component.scss',
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
